import cv2
import mediapipe as mp
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal
from collections import deque
import pandas as pd
from datetime import datetime
import os


class UnderwaterGaitAnalyzer:
    def __init__(self, video_path, output_path="output.mp4"):
        """Initialize the underwater gait analyzer with enhanced features."""
        # FIX: actually use the arguments passed in, don't hardcode filenames
        self.video_path = video_path
        self.output_path = output_path

        # Video setup
        self.cap = cv2.VideoCapture(video_path)
        if not self.cap.isOpened():
            raise FileNotFoundError(f"Could not open video: {video_path}")

        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        if self.fps == 0 or np.isnan(self.fps):
            self.fps = 30
            print(f"⚠ FPS not detected. Using default: {self.fps}")

        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Video writer with better codec
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.out = cv2.VideoWriter(output_path, fourcc, self.fps, (self.width, self.height))

        # MediaPipe setup with optimized parameters for underwater
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.3,  # Lower for underwater
            min_tracking_confidence=0.3,
            model_complexity=2,  # Higher complexity for better accuracy
            enable_segmentation=True,
            smooth_landmarks=True
        )

        # Data storage
        self.frame_count = 0
        self.step_frames_left = []
        self.step_frames_right = []

        # Angle tracking (raw and smoothed) - always kept in sync with frame_count
        self.angles = {
            'left_knee': [], 'right_knee': [],
            'left_ankle': [], 'right_ankle': [],
            'left_hip': [], 'right_hip': [],
            'pelvis_tilt': [], 'pelvis_rotation': []
        }

        # Position tracking for step detection
        self.left_ankle_y = deque(maxlen=10)
        self.right_ankle_y = deque(maxlen=10)
        self.left_knee_y = deque(maxlen=10)
        self.right_knee_y = deque(maxlen=10)

        # Step detection parameters
        self.step_cooldown = 10  # Reduced for better underwater detection
        self.last_left_step = -self.step_cooldown
        self.last_right_step = -self.step_cooldown

        # Tracking confidence - always kept in sync with frame_count
        self.landmark_confidence = []

    def enhance_underwater_frame(self, frame):
        """Enhanced underwater image processing for better visibility."""
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)

        enhanced = cv2.merge((l, a, b))
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

        enhanced = cv2.bilateralFilter(enhanced, 9, 75, 75)
        enhanced = self.color_correct_underwater(enhanced)

        return enhanced

    def color_correct_underwater(self, image):
        """Correct color cast typical in underwater footage."""
        img_float = image.astype(np.float32) / 255.0

        img_float[:, :, 0] *= 0.9   # Blue channel
        img_float[:, :, 1] *= 0.95  # Green channel
        img_float[:, :, 2] *= 1.1   # Red channel

        img_float = np.clip(img_float, 0, 1)
        return (img_float * 255).astype(np.uint8)

    def calculate_angle_3d(self, a, b, c, use_z=False):
        """Calculate angle with optional 3D consideration."""
        a = np.array(a[:3] if use_z else a[:2])
        b = np.array(b[:3] if use_z else b[:2])
        c = np.array(c[:3] if use_z else c[:2])

        ba = a - b
        bc = c - b

        cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
        angle = np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))

        return angle

    def detect_gait_phase(self, ankle_y, knee_y):
        """Detect gait phase based on ankle and knee positions."""
        if len(ankle_y) < 3 or len(knee_y) < 3:
            return None

        ankle_vel = np.gradient(list(ankle_y))
        knee_vel = np.gradient(list(knee_y))

        if ankle_vel[-1] < -0.01 and knee_vel[-1] < 0:
            return "swing"
        elif abs(ankle_vel[-1]) < 0.005:
            return "stance"
        else:
            return "transition"

    def detect_steps_advanced(self):
        """Advanced step detection using multiple criteria."""
        steps_detected = False

        if len(self.left_ankle_y) >= 5:
            recent_y = list(self.left_ankle_y)[-5:]
            if recent_y[2] < recent_y[1] and recent_y[2] < recent_y[3]:
                if self.frame_count - self.last_left_step > self.step_cooldown:
                    self.step_frames_left.append(self.frame_count)
                    self.last_left_step = self.frame_count
                    steps_detected = True

        if len(self.right_ankle_y) >= 5:
            recent_y = list(self.right_ankle_y)[-5:]
            if recent_y[2] < recent_y[1] and recent_y[2] < recent_y[3]:
                if self.frame_count - self.last_right_step > self.step_cooldown:
                    self.step_frames_right.append(self.frame_count)
                    self.last_right_step = self.frame_count
                    steps_detected = True

        return steps_detected

    def smooth_angles_advanced(self, angle_list, window_size=7):
        """
        Advanced smoothing using Savitzky-Golay filter.
        FIX: angle_list may contain np.nan for frames where pose detection
        failed. savgol_filter cannot handle NaNs, so we linearly interpolate
        gaps first (via pandas) and only then smooth. If everything is NaN,
        return as-is.
        """
        arr = np.asarray(angle_list, dtype=float)

        if len(arr) < window_size:
            return arr

        if np.all(np.isnan(arr)):
            return arr

        # Interpolate over NaN gaps (and fill any leading/trailing NaNs)
        series = pd.Series(arr)
        series = series.interpolate(limit_direction='both')
        arr = series.to_numpy()

        # Ensure window_size is odd and not larger than the data
        if window_size % 2 == 0:
            window_size += 1
        if window_size >= len(arr):
            window_size = len(arr) - 1 if len(arr) % 2 == 0 else len(arr)
            if window_size < 3:
                return arr

        return signal.savgol_filter(arr, window_size, 3)

    def draw_angle_visualization(self, frame, landmarks, angle_dict):
        """Draw angle values and indicators on frame."""
        y_offset = 60
        colors = {
            'left': (255, 100, 100),
            'right': (100, 255, 100),
            'pelvis': (255, 100, 255)
        }

        for key, value in angle_dict.items():
            if value is not None and not (isinstance(value, float) and np.isnan(value)):
                color = colors.get(key.split('_')[0], (255, 255, 255))
                text = f"{key.replace('_', ' ').title()}: {value:.1f}°"
                cv2.putText(frame, text, (20, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                y_offset += 25

        return frame

    def _append_nan_frame(self):
        """
        FIX: Called whenever pose landmarks are NOT detected on a frame.
        Keeps self.angles and self.landmark_confidence in lockstep with
        self.frame_count so time axes and array lengths stay consistent
        everywhere downstream.
        """
        for key in self.angles:
            self.angles[key].append(np.nan)
        self.landmark_confidence.append(0.0)

    def process_video(self):
        """Main processing loop with enhanced features."""
        print("🏊 Starting underwater gait analysis...")

        while self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                break

            enhanced_frame = self.enhance_underwater_frame(frame)

            rgb = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb)

            output_frame = enhanced_frame.copy()

            if results.pose_landmarks:
                self.mp_drawing.draw_landmarks(
                    output_frame,
                    results.pose_landmarks,
                    self.mp_pose.POSE_CONNECTIONS,
                    self.mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=2, circle_radius=3),
                    self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2)
                )

                angle_dict = self.extract_angles(results.pose_landmarks.landmark)
                self.update_position_buffers(results.pose_landmarks.landmark)

                step_detected = self.detect_steps_advanced()

                left_phase = self.detect_gait_phase(self.left_ankle_y, self.left_knee_y)
                right_phase = self.detect_gait_phase(self.right_ankle_y, self.right_knee_y)

                output_frame = self.draw_angle_visualization(output_frame,
                                                               results.pose_landmarks.landmark,
                                                               angle_dict)

                total_steps = len(self.step_frames_left) + len(self.step_frames_right)
                cv2.putText(output_frame, f"Total Steps: {total_steps}",
                            (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

                if left_phase:
                    cv2.putText(output_frame, f"L Phase: {left_phase}",
                                (20, self.height - 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 100, 100), 2)
                if right_phase:
                    cv2.putText(output_frame, f"R Phase: {right_phase}",
                                (20, self.height - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 255, 100), 2)

                avg_confidence = float(np.mean([lm.visibility for lm in results.pose_landmarks.landmark]))
                self.landmark_confidence.append(avg_confidence)

                conf_color = (0, 255, 0) if avg_confidence > 0.7 else (0, 255, 255) if avg_confidence > 0.5 else (0, 0, 255)
                cv2.putText(output_frame, f"Tracking: {avg_confidence:.0%}",
                            (self.width - 150, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, conf_color, 2)
            else:
                # FIX: previously nothing was appended here at all, which
                # desynced every array from frame_count. Now we record a
                # NaN placeholder so lengths stay aligned.
                self._append_nan_frame()
                cv2.putText(output_frame, "No pose detected",
                            (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

            self.out.write(output_frame)
            self.frame_count += 1

            if self.frame_count % 30 == 0:
                print(f"Processing frame {self.frame_count}...")

        self.cap.release()
        self.out.release()
        cv2.destroyAllWindows()

        print(f"✅ Processing complete! Output saved to {self.output_path}")

        # Smooth all angles (NaN-safe now)
        for key in self.angles:
            if len(self.angles[key]) > 0:
                self.angles[key] = self.smooth_angles_advanced(self.angles[key])

    def extract_angles(self, landmarks):
        """Extract all joint angles from landmarks."""
        lm = landmarks
        angle_dict = {}

        def get_coords(idx):
            return [lm[idx].x, lm[idx].y, lm[idx].z]

        try:
            left_hip = get_coords(self.mp_pose.PoseLandmark.LEFT_HIP)
            right_hip = get_coords(self.mp_pose.PoseLandmark.RIGHT_HIP)
            left_knee = get_coords(self.mp_pose.PoseLandmark.LEFT_KNEE)
            right_knee = get_coords(self.mp_pose.PoseLandmark.RIGHT_KNEE)
            left_ankle = get_coords(self.mp_pose.PoseLandmark.LEFT_ANKLE)
            right_ankle = get_coords(self.mp_pose.PoseLandmark.RIGHT_ANKLE)
            left_shoulder = get_coords(self.mp_pose.PoseLandmark.LEFT_SHOULDER)
            right_shoulder = get_coords(self.mp_pose.PoseLandmark.RIGHT_SHOULDER)
            left_heel = get_coords(self.mp_pose.PoseLandmark.LEFT_HEEL)
            right_heel = get_coords(self.mp_pose.PoseLandmark.RIGHT_HEEL)

            left_knee_angle = self.calculate_angle_3d(left_hip, left_knee, left_ankle, use_z=True)
            right_knee_angle = self.calculate_angle_3d(right_hip, right_knee, right_ankle, use_z=True)

            left_ankle_angle = self.calculate_angle_3d(left_knee, left_ankle, left_heel, use_z=True)
            right_ankle_angle = self.calculate_angle_3d(right_knee, right_ankle, right_heel, use_z=True)

            left_hip_angle = self.calculate_angle_3d(left_shoulder, left_hip, left_knee, use_z=True)
            right_hip_angle = self.calculate_angle_3d(right_shoulder, right_hip, right_knee, use_z=True)

            pelvis_tilt = self.calculate_angle_3d(left_shoulder, left_hip, right_hip)

            mid_hip = [(left_hip[0] + right_hip[0]) / 2,
                       (left_hip[1] + right_hip[1]) / 2,
                       (left_hip[2] + right_hip[2]) / 2]
            mid_shoulder = [(left_shoulder[0] + right_shoulder[0]) / 2,
                            (left_shoulder[1] + right_shoulder[1]) / 2,
                            (left_shoulder[2] + right_shoulder[2]) / 2]
            pelvis_rotation = self.calculate_angle_3d(left_hip, mid_hip, mid_shoulder)

            self.angles['left_knee'].append(left_knee_angle)
            self.angles['right_knee'].append(right_knee_angle)
            self.angles['left_ankle'].append(left_ankle_angle)
            self.angles['right_ankle'].append(right_ankle_angle)
            self.angles['left_hip'].append(left_hip_angle)
            self.angles['right_hip'].append(right_hip_angle)
            self.angles['pelvis_tilt'].append(pelvis_tilt)
            self.angles['pelvis_rotation'].append(pelvis_rotation)

            angle_dict = {
                'left_knee': left_knee_angle,
                'right_knee': right_knee_angle,
                'left_ankle': left_ankle_angle,
                'right_ankle': right_ankle_angle,
                'left_hip': left_hip_angle,
                'right_hip': right_hip_angle,
                'pelvis_tilt': pelvis_tilt
            }

        except Exception as e:
            print(f"⚠ Angle calculation error: {e}")
            # FIX: use np.nan instead of None so downstream numeric
            # operations (savgol_filter, np.ptp, np.corrcoef) don't break
            for key in self.angles:
                self.angles[key].append(np.nan)

        return angle_dict

    def update_position_buffers(self, landmarks):
        """Update position buffers for step detection."""
        lm = landmarks
        self.left_ankle_y.append(lm[self.mp_pose.PoseLandmark.LEFT_ANKLE].y)
        self.right_ankle_y.append(lm[self.mp_pose.PoseLandmark.RIGHT_ANKLE].y)
        self.left_knee_y.append(lm[self.mp_pose.PoseLandmark.LEFT_KNEE].y)
        self.right_knee_y.append(lm[self.mp_pose.PoseLandmark.RIGHT_KNEE].y)

    def generate_comprehensive_plots(self):
        """Generate detailed plots for gait analysis."""
        print("📊 Generating analysis plots...")

        time_axis = np.arange(len(self.angles['left_knee'])) / self.fps

        fig, axes = plt.subplots(4, 2, figsize=(15, 12))
        fig.suptitle('Underwater Gait Analysis - Joint Angles Over Time', fontsize=16)

        axes[0, 0].plot(time_axis, self.angles['left_knee'], 'b-', label='Left Knee', linewidth=2)
        axes[0, 0].plot(time_axis, self.angles['right_knee'], 'g-', label='Right Knee', linewidth=2)
        axes[0, 0].set_title('Knee Flexion/Extension')
        axes[0, 0].set_ylabel('Angle (degrees)')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)

        axes[0, 1].plot(time_axis, self.angles['left_ankle'], 'b-', label='Left Ankle', linewidth=2)
        axes[0, 1].plot(time_axis, self.angles['right_ankle'], 'g-', label='Right Ankle', linewidth=2)
        axes[0, 1].set_title('Ankle Dorsiflexion/Plantarflexion')
        axes[0, 1].set_ylabel('Angle (degrees)')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)

        axes[1, 0].plot(time_axis, self.angles['left_hip'], 'b-', label='Left Hip', linewidth=2)
        axes[1, 0].plot(time_axis, self.angles['right_hip'], 'g-', label='Right Hip', linewidth=2)
        axes[1, 0].set_title('Hip Flexion/Extension')
        axes[1, 0].set_ylabel('Angle (degrees)')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)

        axes[1, 1].plot(time_axis, self.angles['pelvis_tilt'], 'm-', label='Pelvis Tilt', linewidth=2)
        axes[1, 1].plot(time_axis, self.angles['pelvis_rotation'], 'c-', label='Pelvis Rotation', linewidth=2)
        axes[1, 1].set_title('Pelvis Movement')
        axes[1, 1].set_ylabel('Angle (degrees)')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)

        axes[2, 0].scatter([f / self.fps for f in self.step_frames_left],
                            [1] * len(self.step_frames_left), c='blue', s=50, label='Left Steps')
        axes[2, 0].scatter([f / self.fps for f in self.step_frames_right],
                            [0] * len(self.step_frames_right), c='green', s=50, label='Right Steps')
        axes[2, 0].set_title('Step Detection Timeline')
        axes[2, 0].set_ylabel('Foot (L=1, R=0)')
        axes[2, 0].set_xlabel('Time (s)')
        axes[2, 0].legend()
        axes[2, 0].grid(True, alpha=0.3)
        axes[2, 0].set_ylim([-0.5, 1.5])

        if self.landmark_confidence:
            axes[2, 1].plot(time_axis[:len(self.landmark_confidence)],
                             self.landmark_confidence, 'r-', linewidth=2)
            axes[2, 1].set_title('Pose Tracking Confidence')
            axes[2, 1].set_ylabel('Confidence')
            axes[2, 1].set_xlabel('Time (s)')
            axes[2, 1].grid(True, alpha=0.3)
            axes[2, 1].set_ylim([0, 1])

        if len(self.angles['left_knee']) > 0:
            knee_diff = np.array(self.angles['left_knee']) - np.array(self.angles['right_knee'])
            hip_diff = np.array(self.angles['left_hip']) - np.array(self.angles['right_hip'])
            ankle_diff = np.array(self.angles['left_ankle']) - np.array(self.angles['right_ankle'])

            axes[3, 0].plot(time_axis, knee_diff, 'r-', label='Knee', linewidth=2)
            axes[3, 0].plot(time_axis, hip_diff, 'g-', label='Hip', linewidth=2)
            axes[3, 0].plot(time_axis, ankle_diff, 'b-', label='Ankle', linewidth=2)
            axes[3, 0].axhline(y=0, color='k', linestyle='--', alpha=0.5)
            axes[3, 0].set_title('Left-Right Asymmetry')
            axes[3, 0].set_ylabel('Angle Difference (L-R)')
            axes[3, 0].set_xlabel('Time (s)')
            axes[3, 0].legend()
            axes[3, 0].grid(True, alpha=0.3)

        # FIX: np.ptp() does not ignore NaNs -> use nanmax - nanmin instead
        def safe_rom(vals):
            vals = np.asarray(vals, dtype=float)
            if vals.size == 0 or np.all(np.isnan(vals)):
                return 0.0
            return float(np.nanmax(vals) - np.nanmin(vals))

        rom_data = {
            'Knee L': safe_rom(self.angles['left_knee']),
            'Knee R': safe_rom(self.angles['right_knee']),
            'Hip L': safe_rom(self.angles['left_hip']),
            'Hip R': safe_rom(self.angles['right_hip']),
            'Ankle L': safe_rom(self.angles['left_ankle']),
            'Ankle R': safe_rom(self.angles['right_ankle'])
        }

        axes[3, 1].bar(rom_data.keys(), rom_data.values(), color=['b', 'g', 'b', 'g', 'b', 'g'])
        axes[3, 1].set_title('Range of Motion Summary')
        axes[3, 1].set_ylabel('ROM (degrees)')
        axes[3, 1].tick_params(axis='x', rotation=45)
        axes[3, 1].grid(True, alpha=0.3, axis='y')

        plt.tight_layout()
        plt.savefig('gait_analysis_comprehensive.png', dpi=150, bbox_inches='tight')
        plt.show()

        self.generate_detailed_joint_plots()

    def generate_detailed_joint_plots(self):
        """Generate individual detailed plots for each joint."""
        joints = ['knee', 'ankle', 'hip']

        for joint in joints:
            fig, axes = plt.subplots(1, 2, figsize=(12, 5))
            fig.suptitle(f'{joint.title()} Joint Analysis', fontsize=14)

            time_axis = np.arange(len(self.angles[f'left_{joint}'])) / self.fps

            axes[0].plot(time_axis, self.angles[f'left_{joint}'], 'b-', label='Left', linewidth=2)
            axes[0].plot(time_axis, self.angles[f'right_{joint}'], 'g-', label='Right', linewidth=2)
            axes[0].set_title('Angle Over Time')
            axes[0].set_xlabel('Time (s)')
            axes[0].set_ylabel('Angle (degrees)')
            axes[0].legend()
            axes[0].grid(True, alpha=0.3)

            # FIX: drop NaNs before histogramming or matplotlib will warn/skip oddly
            left_clean = np.asarray(self.angles[f'left_{joint}'], dtype=float)
            right_clean = np.asarray(self.angles[f'right_{joint}'], dtype=float)
            left_clean = left_clean[~np.isnan(left_clean)]
            right_clean = right_clean[~np.isnan(right_clean)]

            axes[1].hist(left_clean, bins=30, alpha=0.5, color='blue', label='Left')
            axes[1].hist(right_clean, bins=30, alpha=0.5, color='green', label='Right')
            axes[1].set_title('Angle Distribution')
            axes[1].set_xlabel('Angle (degrees)')
            axes[1].set_ylabel('Frequency')
            axes[1].legend()
            axes[1].grid(True, alpha=0.3, axis='y')

            plt.tight_layout()
            plt.savefig(f'{joint}_analysis_detailed.png', dpi=150, bbox_inches='tight')
            plt.show()

    def generate_report(self):
        """Generate comprehensive analysis report."""
        print("\n" + "=" * 60)
        print("UNDERWATER GAIT ANALYSIS REPORT")
        print("=" * 60)

        total_time = self.frame_count / self.fps if self.fps > 0 else 0
        total_steps = len(self.step_frames_left) + len(self.step_frames_right)

        print(f"\n📹 Video Analysis:")
        print(f"  - Total frames processed: {self.frame_count}")
        print(f"  - Duration: {total_time:.2f} seconds")
        print(f"  - Frame rate: {self.fps:.2f} FPS")

        print(f"\n👣 Step Analysis:")
        print(f"  - Total steps detected: {total_steps}")
        print(f"  - Left foot steps: {len(self.step_frames_left)}")
        print(f"  - Right foot steps: {len(self.step_frames_right)}")

        if total_time > 0:
            cadence = (total_steps / total_time) * 60
            print(f"  - Cadence: {cadence:.1f} steps/min")

            if len(self.step_frames_left) > 1:
                left_step_times = np.diff(self.step_frames_left) / self.fps
                print(f"  - Left step interval: {np.mean(left_step_times):.2f} ± {np.std(left_step_times):.2f} s")

            if len(self.step_frames_right) > 1:
                right_step_times = np.diff(self.step_frames_right) / self.fps
                print(f"  - Right step interval: {np.mean(right_step_times):.2f} ± {np.std(right_step_times):.2f} s")

        print(f"\n📐 Range of Motion (ROM):")
        for joint in ['knee', 'hip', 'ankle']:
            left_angles = np.asarray(self.angles[f'left_{joint}'], dtype=float)
            right_angles = np.asarray(self.angles[f'right_{joint}'], dtype=float)

            # FIX: NaN-safe ROM (np.ptp breaks on NaN)
            left_rom = float(np.nanmax(left_angles) - np.nanmin(left_angles)) if left_angles.size and not np.all(np.isnan(left_angles)) else 0.0
            right_rom = float(np.nanmax(right_angles) - np.nanmin(right_angles)) if right_angles.size and not np.all(np.isnan(right_angles)) else 0.0

            asymmetry = abs(left_rom - right_rom)

            print(f"\n  {joint.title()}:")
            print(f"    - Left: {left_rom:.1f}°")
            print(f"    - Right: {right_rom:.1f}°")
            print(f"    - Asymmetry: {asymmetry:.1f}° ({asymmetry / max(left_rom, right_rom, 1) * 100:.1f}%)")

            if left_angles.size and not np.all(np.isnan(left_angles)):
                left_mean = np.nanmean(left_angles)
                right_mean = np.nanmean(right_angles)
                print(f"    - Mean angle (L/R): {left_mean:.1f}° / {right_mean:.1f}°")

        if len(self.angles['pelvis_tilt']) > 0:
            tilt = np.asarray(self.angles['pelvis_tilt'], dtype=float)
            rot = np.asarray(self.angles['pelvis_rotation'], dtype=float)
            if not np.all(np.isnan(tilt)):
                print(f"\n  Pelvis:")
                print(f"    - Tilt ROM: {np.nanmax(tilt) - np.nanmin(tilt):.1f}°")
                print(f"    - Rotation ROM: {np.nanmax(rot) - np.nanmin(rot):.1f}°")
                print(f"    - Mean tilt: {np.nanmean(tilt):.1f}°")

        if self.landmark_confidence:
            conf = np.asarray(self.landmark_confidence, dtype=float)
            print(f"\n📊 Tracking Quality:")
            print(f"  - Mean confidence: {np.mean(conf):.1%}")
            print(f"  - Min confidence: {np.min(conf):.1%}")
            print(f"  - Frames with good tracking (>70%): {sum(c > 0.7 for c in conf)}/{len(conf)}")

        print(f"\n⚖️ Symmetry Analysis:")
        for joint in ['knee', 'hip', 'ankle']:
            left_data = np.asarray(self.angles[f'left_{joint}'], dtype=float)
            right_data = np.asarray(self.angles[f'right_{joint}'], dtype=float)

            if left_data.size and right_data.size:
                n = min(len(left_data), len(right_data))
                l, r = left_data[:n], right_data[:n]
                # FIX: mask out any index where either side is NaN before correlating
                mask = ~np.isnan(l) & ~np.isnan(r)
                if mask.sum() > 1:
                    correlation = np.corrcoef(l[mask], r[mask])[0, 1]
                    print(f"  - {joint.title()} correlation (L-R): {correlation:.3f}")
                else:
                    print(f"  - {joint.title()} correlation (L-R): insufficient data")

        print("\n" + "=" * 60)
        print("Report generated successfully!")
        print("=" * 60)

        self.save_report_to_file()

    def save_report_to_file(self):
        """Save detailed report to CSV and text files."""
        n = len(self.angles['left_knee'])
        data = {
            'Frame': list(range(n)),
            'Time_sec': [f / self.fps for f in range(n)],
            'Left_Knee': self.angles['left_knee'],
            'Right_Knee': self.angles['right_knee'],
            'Left_Hip': self.angles['left_hip'],
            'Right_Hip': self.angles['right_hip'],
            'Left_Ankle': self.angles['left_ankle'],
            'Right_Ankle': self.angles['right_ankle'],
            'Pelvis_Tilt': self.angles['pelvis_tilt'],
            'Pelvis_Rotation': self.angles['pelvis_rotation']
        }

        df = pd.DataFrame(data)

        csv_filename = f"gait_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(csv_filename, index=False)
        print(f"\n📁 Detailed data saved to: {csv_filename}")

        stats_df = df.describe()
        stats_df.to_csv(f"gait_statistics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")

        return df

    def run_complete_analysis(self):
        """Run the complete analysis pipeline."""
        self.process_video()
        self.generate_comprehensive_plots()
        self.generate_report()

        return self.angles, self.step_frames_left, self.step_frames_right


# ============= MAIN EXECUTION =============
def main():
    """Main function to run the underwater gait analysis."""

    VIDEO_PATH = "2nd_Aug_S2.mp4"       # Input video
    OUTPUT_PATH = "2nd_Aug_S2_OP.mp4"   # Output video

    print("🌊 Underwater Gait Analysis System")
    print("=" * 60)

    if not os.path.exists(VIDEO_PATH):
        print(f"❌ Error: Video file '{VIDEO_PATH}' not found!")
        print("Please ensure the video file is in the correct location.")
        return

    analyzer = UnderwaterGaitAnalyzer(VIDEO_PATH, OUTPUT_PATH)
    angles, left_steps, right_steps = analyzer.run_complete_analysis()

    print("\n✅ Analysis complete!")
    print(f"📹 Processed video saved as: {OUTPUT_PATH}")
    print("📊 Plots have been displayed and saved")
    print("📁 Data files have been exported")

    return {
        'angles': angles,
        'left_steps': left_steps,
        'right_steps': right_steps,
        'fps': analyzer.fps,
        'total_frames': analyzer.frame_count
    }


if __name__ == "__main__":
    results = main()