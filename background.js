chrome.storage.onChanged.addListener((changes, areaName) => {
  const length = changes.history.newValue.length
  if (length > 0) {
    const lastPickedColor =
      changes.history.newValue[length - 1].hexcode ?? '#FFFFFF'
    chrome.action.setBadgeText({ text: ' ' })
    chrome.action.setBadgeBackgroundColor({ color: `#${lastPickedColor}` })
  }
})
