import fs from 'fs';
import path from 'path';

export function mediapipe_workaround() {
  return {
    name: 'mediapipe_workaround',
    load(id) {
      const basename = path.basename(id);
      if (basename === 'selfie_segmentation.js' || basename === 'pose.js') {
        let code = fs.readFileSync(id, 'utf-8');
        if (basename === 'selfie_segmentation.js') {
          code += 'exports.SelfieSegmentation = SelfieSegmentation;';
        } else if (basename === 'pose.js') {
          code += 'exports.Pose = Pose;';
        }
        return { code };
      } else {
        return null;
      }
    },
  };
}