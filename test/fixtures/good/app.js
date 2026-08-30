const SETTINGS_KEY = "demo-settings-v1";
localStorage.setItem(SETTINGS_KEY, "{}");
localStorage.setItem("demo-gate-lock-v1", "0");

function eraseDeviceData() {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem("demo-gate-lock-v1");
}
