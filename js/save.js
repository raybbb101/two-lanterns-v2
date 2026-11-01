// 進行状況の保存。ジョブごとに 1 つ、このブラウザの中に残す。
const KEY = (job) => `ftn-save-${job}`;
const VERSION = 1;

export function loadSave(job) {
  try {
    const d = JSON.parse(localStorage.getItem(KEY(job)));
    return d && d.v === VERSION && d.job === job && d.weapon ? d : null;
  } catch (e) { return null; }
}

export function writeSave(d) {
  try { localStorage.setItem(KEY(d.job), JSON.stringify({ ...d, v: VERSION })); return true; } catch (e) { return false; }
}

export function deleteSave(job) {
  try { localStorage.removeItem(KEY(job)); } catch (e) { /* 無視 */ }
}

// 別のブラウザへ移すための文字列
export const exportSave = (d) => btoa(encodeURIComponent(JSON.stringify(d)));
export function importSave(text) {
  try {
    const d = JSON.parse(decodeURIComponent(atob(text.trim())));
    return d && d.v === VERSION && d.job && d.weapon ? d : null;
  } catch (e) { return null; }
}
