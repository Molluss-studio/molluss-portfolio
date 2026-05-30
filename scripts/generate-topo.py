#!/usr/bin/env python3
"""Generate a large, non-repeating organic topographic background."""

import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

WIDTH = 3600
HEIGHT = 2700
GRID_W = 300
GRID_H = 225
LEVELS = 18
STROKE = "rgba(240,237,230,0.13)"
STROKE_WIDTH = 1
SMOOTH_PASSES = 5
FINAL_SMOOTH = 2
SEED = 42
ZOOM = 1.0
MIN_PATH_LEN = 40
MIN_LOOP_AREA = 280.0
DECIMATE = 1.6
RESAMPLE_STEP = 10.0
CURVE_TENSION = 4.0
CLOSE_TOL = 8.0
USE_CURVES = True

PORTRAIT_W = 300
PORTRAIT_H = 375
PORTRAIT_GRID_W = 50
PORTRAIT_GRID_H = 62
PORTRAIT_LEVELS = 10
PORTRAIT_CROP_X = 3180
PORTRAIT_CROP_Y = 120
PORTRAIT_STROKE = "rgba(240,237,230,0.32)"
PORTRAIT_STROKE_WIDTH = 0.7
PORTRAIT_MIN_PATH_LEN = 12
PORTRAIT_MIN_LOOP_AREA = 35
PORTRAIT_RESAMPLE_STEP = 4.0


def smooth_field(z, sigma):
    try:
        from scipy.ndimage import gaussian_filter

        return gaussian_filter(z, sigma=sigma, mode="nearest")
    except ImportError:
        out = z.copy()
        k = max(3, int(sigma * 2) | 1)
        ax = np.arange(k) - k // 2
        kernel = np.exp(-(ax * ax) / (2 * (sigma * sigma + 1e-6)))
        kernel /= kernel.sum()
        for _ in range(3):
            out = np.apply_along_axis(lambda m: np.convolve(m, kernel, mode="same"), 1, out)
            out = np.apply_along_axis(lambda m: np.convolve(m, kernel, mode="same"), 0, out)
        return out


def build_height_field():
    rng = np.random.default_rng(SEED)

    n0 = rng.standard_normal((GRID_H, GRID_W))
    n1 = rng.standard_normal((GRID_H, GRID_W))
    n2 = rng.standard_normal((GRID_H, GRID_W))

    z = smooth_field(n0, 7.0)
    z += 0.50 * smooth_field(n1, 19)
    z += 0.18 * smooth_field(n2, 2.8)

    xs = np.linspace(0, 1, GRID_W) * ZOOM
    ys = np.linspace(0, 1, GRID_H) * ZOOM
    x, y = np.meshgrid(xs, ys)

    bumps = [
        (0.18, 0.22, 0.74, 0.13),
        (0.42, 0.14, 0.64, 0.14),
        (0.68, 0.28, 0.68, 0.13),
        (0.84, 0.46, 0.54, 0.12),
        (0.12, 0.58, 0.60, 0.13),
        (0.34, 0.72, 0.58, 0.12),
        (0.58, 0.62, 0.64, 0.13),
        (0.76, 0.78, 0.50, 0.12),
        (0.50, 0.44, 0.42, 0.15),
    ]
    for bx, by, amp, spread in bumps:
        z += amp * np.exp(-(((x - bx) ** 2 + (y - by) ** 2) / (2 * spread * spread)))

    z += 0.038 * np.sin(2.0 * np.pi * x + 0.7) * np.cos(1.5 * np.pi * y + 1.0)
    z = smooth_field(z, 3.0)
    return z


def resample_uniform(points, step, closed=False):
    if len(points) < 2 or step <= 0:
        return points

    if closed and len(points) > 2 and points[0] != points[-1]:
        loop = points + [points[0]]
    else:
        loop = points

    seg_lens = []
    total = 0.0
    for i in range(len(loop) - 1):
        length = math.hypot(loop[i + 1][0] - loop[i][0], loop[i + 1][1] - loop[i][1])
        seg_lens.append(length)
        total += length
    if total < step:
        return points

    out = [loop[0]]
    seg_idx = 0
    seg_pos = 0.0
    dist = step
    while dist < total - 1e-6:
        while seg_idx < len(seg_lens) and seg_pos + seg_lens[seg_idx] < dist:
            seg_pos += seg_lens[seg_idx]
            seg_idx += 1
        if seg_idx >= len(seg_lens):
            break
        t = (dist - seg_pos) / max(seg_lens[seg_idx], 1e-9)
        x0, y0 = loop[seg_idx]
        x1, y1 = loop[seg_idx + 1]
        out.append((x0 + t * (x1 - x0), y0 + t * (y1 - y0)))
        dist += step

    if closed:
        if out[0] != out[-1]:
            out.append(out[0])
    elif out[-1] != loop[-1]:
        out.append(loop[-1])
    return out


def decimate(points, min_dist):
    if len(points) < 3 or min_dist <= 0:
        return points
    out = [points[0]]
    min_sq = min_dist * min_dist
    for pt in points[1:]:
        dx = pt[0] - out[-1][0]
        dy = pt[1] - out[-1][1]
        if dx * dx + dy * dy >= min_sq:
            out.append(pt)
    if out[-1] != points[-1]:
        out.append(points[-1])
    return out


def chaikin(points, passes, closed=False):
    if len(points) < 3:
        return points
    result = points
    for _ in range(passes):
        if closed and len(result) > 2:
            loop = result + [result[0]]
        else:
            loop = result
        smoothed = [loop[0]]
        for i in range(len(loop) - 1):
            x0, y0 = loop[i]
            x1, y1 = loop[i + 1]
            smoothed.append((0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1))
            smoothed.append((0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1))
        if closed:
            smoothed = smoothed[:-1]
        else:
            smoothed.append(loop[-1])
        result = smoothed
    return result


def polyline_length(points):
    total = 0.0
    for i in range(1, len(points)):
        total += math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    return total


def shoelace_area(points):
    if len(points) < 3:
        return 0.0
    area = 0.0
    for i in range(len(points)):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % len(points)]
        area += x1 * y2 - x2 * y1
    return abs(area) * 0.5


def is_closed(points, tol=CLOSE_TOL):
    if len(points) < 4:
        return False
    x0, y0 = points[0]
    x1, y1 = points[-1]
    return (x0 - x1) ** 2 + (y0 - y1) ** 2 <= tol * tol


def snap_closed(points):
    if is_closed(points):
        x0, y0 = points[0]
        if points[-1] != (x0, y0):
            points = points[:-1] + [(x0, y0)]
    return points


def should_keep(points, min_len=MIN_PATH_LEN, min_area=MIN_LOOP_AREA):
    if len(points) < 2:
        return False
    if polyline_length(points) < min_len:
        return False
    if is_closed(points) and shoelace_area(points) < min_area:
        return False
    return True


def sample_field_region(z, x0, y0, w, h, gw, gh):
    xs = np.linspace(x0, x0 + w, gw)
    ys = np.linspace(y0, y0 + h, gh)
    xi = (xs / WIDTH) * (GRID_W - 1)
    yi = (ys / HEIGHT) * (GRID_H - 1)
    xx, yy = np.meshgrid(xi, yi)

    x0i = np.floor(xx).astype(int)
    y0i = np.floor(yy).astype(int)
    x1i = np.minimum(x0i + 1, GRID_W - 1)
    y1i = np.minimum(y0i + 1, GRID_H - 1)
    tx = xx - x0i
    ty = yy - y0i

    z00 = z[y0i, x0i]
    z10 = z[y0i, x1i]
    z01 = z[y1i, x0i]
    z11 = z[y1i, x1i]
    return z00 * (1 - tx) * (1 - ty) + z10 * tx * (1 - ty) + z01 * (1 - tx) * ty + z11 * tx * ty


def extract_contours(z, width, height, grid_w, grid_h, levels_count):
    x = np.linspace(0, width, grid_w)
    y = np.linspace(0, height, grid_h)
    xx, yy = np.meshgrid(x, y)

    lo = float(z.min())
    hi = float(z.max())
    pad = (hi - lo) * 0.06
    levels = np.linspace(lo + pad, hi - pad, levels_count)

    fig, ax = plt.subplots(figsize=(8, 6))
    try:
        cs = ax.contour(xx, yy, z, levels=levels)
    finally:
        plt.close(fig)

    results = []
    for segs in cs.allsegs:
        for seg in segs:
            if len(seg) < 2:
                continue
            pts = [(float(px), float(py)) for px, py in seg]
            results.append(pts)
    return results


def process_path(pts, resample_step=RESAMPLE_STEP):
    closed = is_closed(pts)
    if SMOOTH_PASSES and len(pts) >= 3:
        pts = chaikin(pts, SMOOTH_PASSES, closed=closed)
    pts = decimate(pts, DECIMATE)
    if FINAL_SMOOTH and len(pts) >= 3:
        pts = chaikin(pts, FINAL_SMOOTH, closed=closed)
    if resample_step and len(pts) >= 3:
        pts = resample_uniform(pts, resample_step, closed=closed)
    if closed:
        pts = snap_closed(pts)
    return pts


def path_to_d(points):
    if len(points) < 2:
        return ""

    closed = is_closed(points)
    pts = list(points)
    if closed and len(pts) > 1 and pts[-1] == pts[0]:
        pts = pts[:-1]

    if len(pts) == 2:
        parts = [
            f"M{pts[0][0]:.2f},{pts[0][1]:.2f}",
            f"L{pts[1][0]:.2f},{pts[1][1]:.2f}",
        ]
        if closed:
            parts.append("Z")
        return " ".join(parts)

    if USE_CURVES and len(pts) >= 4:
        if closed:
            wrap = [pts[-2], pts[-1], *pts, pts[0], pts[1]]
            start = 2
            end = start + len(pts)
        else:
            wrap = [pts[0], *pts, pts[-1]]
            start = 1
            end = start + len(pts) - 1

        parts = [f"M{pts[0][0]:.2f},{pts[0][1]:.2f}"]
        for i in range(start, end):
            p0, p1, p2, p3 = wrap[i - 1 : i + 3]
            t = CURVE_TENSION
            cp1x = p1[0] + (p2[0] - p0[0]) / t
            cp1y = p1[1] + (p2[1] - p0[1]) / t
            cp2x = p2[0] - (p3[0] - p1[0]) / t
            cp2y = p2[1] - (p3[1] - p1[1]) / t
            parts.append(
                f"C{cp1x:.2f},{cp1y:.2f} {cp2x:.2f},{cp2y:.2f} {p2[0]:.2f},{p2[1]:.2f}"
            )
        if closed:
            parts.append("Z")
        return " ".join(parts)

    parts = [f"M{pts[0][0]:.2f},{pts[0][1]:.2f}"]
    for x, y in pts[1:]:
        parts.append(f"L{x:.2f},{y:.2f}")
    if closed:
        parts.append("Z")
    return " ".join(parts)


def build_svg(paths, width, height, group_id, stroke, stroke_width, include_class=False):
    path_els = []
    for d in paths:
        cls = ' class="topo-line"' if include_class else ""
        path_els.append(
            f'  <path{cls} fill="none" stroke="{stroke}" '
            f'stroke-width="{stroke_width}" stroke-linecap="round" stroke-linejoin="round" d="{d}"/>'
        )
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" fill="none" aria-hidden="true">',
        f'<g id="{group_id}" fill="none" stroke-linecap="round" stroke-linejoin="round">',
        *path_els,
        "</g>",
        "</svg>",
    ]


def paths_from_field(z, width, height, grid_w, grid_h, levels_count, min_len, min_area, resample_step):
    raw_paths = extract_contours(z, width, height, grid_w, grid_h, levels_count)
    paths = []
    dropped = 0
    for pts in raw_paths:
        pts = process_path(pts, resample_step=resample_step)
        if not should_keep(pts, min_len=min_len, min_area=min_area):
            dropped += 1
            continue
        d = path_to_d(pts)
        if d:
            paths.append(d)
    return paths, dropped


def main():
    assets = Path(__file__).resolve().parent.parent / "assets"
    z = build_height_field()

    bg_paths, bg_dropped = paths_from_field(
        z, WIDTH, HEIGHT, GRID_W, GRID_H, LEVELS, MIN_PATH_LEN, MIN_LOOP_AREA, RESAMPLE_STEP
    )
    bg_out = assets / "topo-lines.svg"
    bg_out.write_text("\n".join(build_svg(bg_paths, WIDTH, HEIGHT, "topo-lines", STROKE, STROKE_WIDTH, True)), encoding="utf-8")
    print(f"Wrote {len(bg_paths)} paths ({WIDTH}x{HEIGHT}) to {bg_out} (dropped {bg_dropped})")

    crop_x = min(PORTRAIT_CROP_X, WIDTH - PORTRAIT_W)
    crop_y = min(PORTRAIT_CROP_Y, HEIGHT - PORTRAIT_H)
    z_portrait = sample_field_region(z, crop_x, crop_y, PORTRAIT_W, PORTRAIT_H, PORTRAIT_GRID_W, PORTRAIT_GRID_H)
    portrait_paths, portrait_dropped = paths_from_field(
        z_portrait,
        PORTRAIT_W,
        PORTRAIT_H,
        PORTRAIT_GRID_W,
        PORTRAIT_GRID_H,
        PORTRAIT_LEVELS,
        PORTRAIT_MIN_PATH_LEN,
        PORTRAIT_MIN_LOOP_AREA,
        PORTRAIT_RESAMPLE_STEP,
    )
    portrait_out = assets / "portrait-deco.svg"
    portrait_out.write_text(
        "\n".join(build_svg(portrait_paths, PORTRAIT_W, PORTRAIT_H, "portrait-deco", PORTRAIT_STROKE, PORTRAIT_STROKE_WIDTH)),
        encoding="utf-8",
    )
    print(
        f"Wrote {len(portrait_paths)} paths ({PORTRAIT_W}x{PORTRAIT_H}) to {portrait_out} "
        f"(dropped {portrait_dropped}, crop {crop_x},{crop_y})"
    )


if __name__ == "__main__":
    main()
