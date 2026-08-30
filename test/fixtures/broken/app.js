const SETTINGS_KEY = "demo-settings-v1";
localStorage.setItem(SETTINGS_KEY, "{}");
localStorage.setItem("demo-gate-lock-v1", "0");
localStorage.setItem("demo-undeclared-v1", "1");

function eraseDeviceData() {
  localStorage.removeItem(SETTINGS_KEY);
}
