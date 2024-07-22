import fs from 'fs';
import path from 'path';

export function mediapipe_workaround() {
  return {
    name: 'mediapipe_workaround',
    load(id) {
      if (path.basename(id) === 'selfie_segmentation.js') {
        let code = fs.readFileSync(id, 'utf-8');
        code += 'exports.SelfieSegmentation = SelfieSegmentation;';
        return { code };
      } else {
        return null;
      }
    },
  };
}