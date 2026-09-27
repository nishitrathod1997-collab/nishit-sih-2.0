import sys
import os
import json
import math
import argparse
import hashlib
import time

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

# Class ID mappings for COCO dataset
# 2: car, 3: motorcycle, 5: bus, 7: truck
COCO_VEHICLE_CLASSES = {
    2: 'car',
    3: 'bike',
    5: 'bus',
    7: 'truck'
}

def point_in_polygon(point, polygon):
    """
    Ray-casting algorithm to test if (x, y) is inside polygon [(x1, y1), ...].
    All coordinates normalized [0..1].
    """
    if not polygon or len(polygon) < 3:
        return True # Default to true if no valid region specified
    x, y = point
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def line_side_and_projection(point, line_start, line_end):
    """
    Calculates signed cross product (which side of line) and normalized projection along line.
    line_start = (x1, y1), line_end = (x2, y2), point = (x, y)
    Positive side = left of line (direction vector start -> end).
    """
    x1, y1 = line_start
    x2, y2 = line_end
    px, py = point

    dx = x2 - x1
    dy = y2 - y1

    # Cross product (dx * (py - y1) - dy * (px - x1))
    cross = dx * (py - y1) - dy * (px - x1)

    # Dot product projection
    line_len_sq = dx * dx + dy * dy
    if line_len_sq == 0:
        return 0, 0
    t = ((px - x1) * dx + (py - y1) * dy) / line_len_sq
    return cross, t

def compute_config_hash(video_path, region, line, mapped_direction, sample_fps):
    data = {
        "video": os.path.basename(video_path),
        "region": region,
        "line": line,
        "mapped_direction": mapped_direction,
        "sample_fps": sample_fps
    }
    raw = json.dumps(data, sort_keys=True)
    return hashlib.md5(raw.encode('utf-8')).hexdigest()

def analyze_video(video_path, region, line, mapped_direction, sample_fps=5, conf_thresh=0.25, output_cache_path=None):
    if cv2 is None or YOLO is None or np is None:
        return {
            "error": "MISSING_DEPENDENCIES",
            "message": "OpenCV or Ultralytics (YOLO) is not installed in Python environment."
        }

    if not os.path.exists(video_path):
        return {
            "error": "FILE_NOT_FOUND",
            "message": f"Video file not found at path: {video_path}"
        }

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "error": "DECODE_ERROR",
            "message": f"Could not decode video file: {video_path}"
        }

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    duration_sec = total_frames / fps
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720

    # Load small YOLO model
    try:
        model = YOLO('yolov8n.pt')
    except Exception as e:
        return {
            "error": "MODEL_LOAD_ERROR",
            "message": f"Failed to load YOLOv8 model: {str(e)}"
        }

    # Tracking state: track_id -> { "last_side": float, "last_t": float, "crossed": bool, "positions": [] }
    tracks_state = {}
    arrival_events = []
    frames_results = []
    
    counts_by_class = {"car": 0, "bike": 0, "bus": 0, "truck": 0}
    total_crossings = 0
    start_wall_time = time.time()

    # Step size based on sample_fps
    frame_step = max(1, int(round(fps / sample_fps)))

    line_start = line.get("start", [0.2, 0.5])
    line_end = line.get("end", [0.8, 0.5])
    expected_crossing_dir = line.get("incomingDirection", "positive") # "positive" or "negative"

    # Validate inputs
    dx_line = line_end[0] - line_start[0]
    dy_line = line_end[1] - line_start[1]
    if (dx_line * dx_line + dy_line * dy_line) == 0:
        return {
            "error": "INVALID_GEOMETRY",
            "message": "Counting line segment length cannot be zero."
        }

    current_frame_idx = 0
    processed_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if current_frame_idx % frame_step != 0:
            current_frame_idx += 1
            continue

        video_time_sec = round(current_frame_idx / fps, 3)
        processed_count += 1

        # Emit progress every 30 processed frames
        if processed_count % 30 == 0:
            prog_pct = min(99.0, round((current_frame_idx / total_frames) * 100, 1))
            print(json.dumps({"type": "progress", "progress": prog_pct, "processed_frames": processed_count}), flush=True)

        # Run ByteTrack tracking explicitly
        try:
            results = model.track(
                frame,
                persist=True,
                tracker='bytetrack.yaml',
                verbose=False,
                conf=conf_thresh,
                classes=list(COCO_VEHICLE_CLASSES.keys())
            )
        except Exception as e:
            return {
                "error": "TRACKER_ERROR",
                "message": f"Object tracker (bytetrack.yaml) failed: {str(e)}"
            }

        visible_detections = []

        if results and len(results) > 0:
            res = results[0]
            boxes = res.boxes
            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    veh_type = COCO_VEHICLE_CLASSES.get(cls_id, 'car')
                    
                    # Track ID (can be 0!)
                    track_id = int(box.id[0].item()) if (box.id is not None and len(box.id) > 0) else None
                    
                    # Bounding box in normalized coords [0..1]
                    xyxy = box.xyxy[0].tolist()
                    norm_bbox = [
                        round(xyxy[0] / width, 4),
                        round(xyxy[1] / height, 4),
                        round(xyxy[2] / width, 4),
                        round(xyxy[3] / height, 4)
                    ]

                    # Centroid normalized
                    cx = (norm_bbox[0] + norm_bbox[2]) / 2.0
                    cy = (norm_bbox[1] + norm_bbox[3]) / 2.0
                    centroid = (cx, cy)

                    # Check Region of Interest (ROI)
                    in_roi = point_in_polygon(centroid, region)

                    visible_detections.append({
                        "trackId": track_id,
                        "type": veh_type,
                        "confidence": round(conf, 2),
                        "bbox": norm_bbox,
                        "inRoi": in_roi
                    })

                    # Process counting line for tracked objects inside ROI
                    if track_id is not None and in_roi:
                        cross, proj_t = line_side_and_projection(centroid, line_start, line_end)

                        if track_id not in tracks_state:
                            tracks_state[track_id] = {
                                "last_side": cross,
                                "last_t": proj_t,
                                "crossed": False,
                                "type": veh_type
                            }
                        else:
                            state_obj = tracks_state[track_id]
                            prev_side = state_obj["last_side"]

                            if not state_obj["crossed"]:
                                # Direction check based on cross-product sign transition:
                                # positive (arrow direction): prev_side < 0 and cross >= 0
                                # negative (opposite arrow): prev_side > 0 and cross <= 0
                                if expected_crossing_dir == "positive" and prev_side < 0 and cross >= 0:
                                    valid_dir = True
                                elif expected_crossing_dir == "negative" and prev_side > 0 and cross <= 0:
                                    valid_dir = True
                                elif expected_crossing_dir == "any" and prev_side * cross < 0:
                                    valid_dir = True
                                else:
                                    valid_dir = False

                                if valid_dir and (-0.15 <= proj_t <= 1.15):
                                    state_obj["crossed"] = True
                                    total_crossings += 1
                                    counts_by_class[veh_type] = counts_by_class.get(veh_type, 0) + 1

                                    arrival_events.append({
                                        "eventId": f"evt-tr-{track_id}-{total_crossings}",
                                        "videoTimeSec": video_time_sec,
                                        "trackId": track_id,
                                        "vehicleType": veh_type,
                                        "mappedDirection": mapped_direction
                                    })

                            state_obj["last_side"] = cross
                            state_obj["last_t"] = proj_t

        frames_results.append({
            "videoTimeSec": video_time_sec,
            "detections": visible_detections
        })

        current_frame_idx += 1

    cap.release()
    elapsed_wall_time = time.time() - start_wall_time

    analysis_output = {
        "status": "COMPLETED",
        "videoMetadata": {
            "durationSec": round(duration_sec, 2),
            "width": width,
            "height": height,
            "fps": fps,
            "totalFrames": total_frames
        },
        "analysisStats": {
            "processedFrames": processed_count,
            "wallTimeSec": round(elapsed_wall_time, 2),
            "fpsAchieved": round(processed_count / max(0.1, elapsed_wall_time), 1),
            "totalUniqueTracks": len(tracks_state),
            "totalIncomingCrossings": total_crossings,
            "countsByClass": counts_by_class
        },
        "config": {
            "region": region,
            "line": line,
            "mappedDirection": mapped_direction,
            "sampleFps": sample_fps
        },
        "arrivalEvents": arrival_events,
        "frames": frames_results
    }

    if output_cache_path:
        os.makedirs(os.path.dirname(output_cache_path), exist_ok=True)
        with open(output_cache_path, 'w') as f:
            json.dump(analysis_output, f, indent=2)

    return analysis_output



if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Vehicle Detection and Tracking Worker")
    parser.add_argument("--video", required=True, help="Path to input video file")
    parser.add_argument("--config", required=True, help="JSON string or file path containing region and line configuration")
    parser.add_argument("--output", required=False, help="Path to save output JSON cache")
    parser.add_argument("--sample_fps", type=int, default=5, help="Frame sampling rate")

    args = parser.parse_args()

    # Parse config
    if os.path.exists(args.config):
        with open(args.config, 'r') as f:
            config_data = json.load(f)
    else:
        config_data = json.loads(args.config)

    region = config_data.get("region", [])
    line = config_data.get("line", {})
    mapped_dir = config_data.get("mappedDirection", "S")

    result = analyze_video(
        video_path=args.video,
        region=region,
        line=line,
        mapped_direction=mapped_dir,
        sample_fps=args.sample_fps,
        output_cache_path=args.output
    )

    # Final result stdout output
    print(json.dumps({"type": "result", "data": result}), flush=True)
