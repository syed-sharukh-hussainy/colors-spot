document.addEventListener('DOMContentLoaded', () => {
  // * DOM Elements
  const colorPickerEyeDropper = document.getElementById('eyedropper-btn')
  const cantAccess = document.querySelector('.cant-access')
  const clearAllColorBtn = document.getElementById('clear-all')
  const colorPickerCon = document.querySelector('.color-picker')
  const addCustomHexCode = document.querySelector('.add-hex-color')
  const hexColorElem = document.querySelector('.hex-color-value')
  const tabsContents = document.querySelectorAll('.content')
  const tabs = document.querySelectorAll('.tabs h3')

  // * Tabs login to toggle between Picker and History Tab
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach((tab) => tab.classList.remove('active'))
      tab.classList.add('active')

      tabsContents.forEach((content) => content.classList.remove('active'))
      tabsContents[index].classList.add('active')
    })
  })

  async function checkEyedropperSupport() {
    let queryOptions = { active: true, currentWindow: true }
    let [tab] = await chrome.tabs.query(queryOptions)

    if (tab.url === undefined || tab.url.indexOf('chrome') == 0) {
      cantAccess.style.display = 'block'
      colorPickerCon.style.display = 'none'
    } else if (tab.url.indexOf('file') === 0) {
      cantAccess.style.display = 'block'
      colorPickerCon.style.display = 'none'
    } else if (!window.EyeDropper) {
      cantAccess.style.display = 'none'
      colorPickerCon.style.display = 'none'
    } else {
      cantAccess.style.display = 'none'
      colorPickerCon.style.display = 'block'
    }
  }

  colorPickerEyeDropper.addEventListener('click', async () => {
    let queryOptions = { active: true, currentWindow: true }
    let [tab] = await chrome.tabs.query(queryOptions)

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: pickColor,
    })
    window.close()
  })

  async function pickColor() {
    try {
      const eyedropper = new EyeDropper()
      const { sRGBHex } = await eyedropper.open()
      const codeWithOutHex = sRGBHex.substring(1, sRGBHex.length).toUpperCase()
      const response = await fetch(
        `https://www.thecolorapi.com/id?hex=${codeWithOutHex}`
      )
      const data = await response.json()
      const colorName = data.name.value
      const { r, g, b } = data.rgb
      const { h, s, v } = data.hsv
      const { h: hh, s: ss, l } = data.hsl
      const colorInfo = {
        colorname: colorName,
        isExist: true,
        hexcode: codeWithOutHex,
        rgb: {
          r,
          g,
          b,
        },
        hsv: {
          h,
          s,
          v,
        },
        hsl: {
          hh,
          ss,
          l,
        },
      }

      chrome.storage.local.get('history', (res) => {
        const historyColors = res.history ?? []
        const duplicateColor = historyColors.find((color) => {
          return color.hexcode == codeWithOutHex
        })
        if (!historyColors.includes(duplicateColor)) {
          if (historyColors && historyColors.length > 0) {
            chrome.storage.local.set({
              history: [...historyColors, colorInfo],
            })
          } else {
            chrome.storage.local.set({ history: [colorInfo] })
          }
        } else {
          alert(`#${codeWithOutHex} Color Already Exists in the history`)
        }
      })
    } catch (e) {
      console.log(e)
    }
  }

  clearAllColorBtn.addEventListener('click', () => {
    const historyColorsListElem = document.getElementById('history-color-list')

    chrome.storage.local.set(
      {
        history: [],
      },
      () => {
        historyColorsListElem.style.display = 'none'
        showBadge()
        showHistoryColors()
        changeUIOfPickerTab()
        changeUIOfPickerTabWithHex()
      }
    )
  })

  // CREATE LIST TAG AND ADD TO SHOW COLORS IN HISTORY TAB
  const showHistoryColors = () => {
    const historyColorsListElem = document.getElementById('history-color-list')
    const colorCopiedElem = document.querySelector('.color-copied')
    const emptyListPrompt = document.querySelector('.empty-list-prompt')

    chrome.storage.local.get('history', (res) => {
      const historyColors = res.history ?? []
      if (historyColors && historyColors.length > 0) {
        const liTag = historyColors
          .map(
            (color) =>
              `<li class="history-color" data-color="#${color.hexcode}" style="background-color: #${color.hexcode}"></li>`
          )
          .join('')
        historyColorsListElem.innerHTML = liTag
        document.querySelectorAll('.history-color').forEach((li) => {
          li.addEventListener('click', (e) => {
            navigator.clipboard.writeText(e.currentTarget.dataset.color)
            colorCopiedElem.style.display = 'block'
            setTimeout(() => {
              colorCopiedElem.style.display = 'none'
            }, 1000)
          })
        })
      }
      if (historyColors.length === 0) {
        clearAllColorBtn.style.display = 'none'
        emptyListPrompt.style.display = 'block'
      } else {
        clearAllColorBtn.style.display = 'block'
        emptyListPrompt.style.display = 'none'
      }
    })
  }

  const changeUIOfPickerTab = () => {
    chrome.storage.local.get(['history'], (res) => {
      const historyColors = res.history ?? []
      if (!historyColors.length == 0) {
        const { hexcode, colorname, rgb, hsl, hsv } =
          historyColors[historyColors.length - 1]
        setColorValues(hexcode, colorname, rgb, hsl, hsv)
      } else {
        setColorValues(
          'FFFFFF',
          'White',
          {
            r: 255,
            g: 255,
            b: 255,
          },
          { hh: 0, ss: 0, l: 100 },
          {
            h: 0,
            s: 0,
            v: 100,
          }
        )
      }
    })
  }

  const changeUIOfPickerTabWithHex = () => {
    const invalidHexCode = document.querySelector('.invalid-hex')

    hexColorElem.addEventListener('input', async (event) => {
      if (
        event.target.value.length >= 7 &&
        event.target.value.substring(0, 1)
      ) {
        hexColorElem.value = hexColorElem.value.slice(0, 7)
        const colorInfo = await fetchColorValues(
          hexColorElem.value.substring(1)
        )
        const { hexcode, colorname, rgb, hsl, hsv } = colorInfo

        console.log(colorInfo)
        setColorValues(hexcode, colorname, rgb, hsl, hsv)
      }

      if (!isValidHexCode(event.target.value)) {
        invalidHexCode.style.display = 'block'
      } else {
        invalidHexCode.style.display = 'none'
      }
    })
  }

  const addHexCode = async () => {
    const colorAddedToHistory = document.querySelector('.color-added')
    const colorExistsElem = document.querySelector('.color-exists')
    const codeWithOutHex = hexColorElem.value.substring(1)
    const colorInfo = await fetchColorValues(codeWithOutHex)

    chrome.storage.local.get(['history'], (response) => {
      const historyColors = response.history ?? []
      const duplicateColor = historyColors.find((color) => {
        return color.hexcode == codeWithOutHex
      })

      if (historyColors.includes(duplicateColor)) {
        colorExistsElem.style.display = 'block'
        setTimeout(() => {
          colorExistsElem.style.display = 'none'
        }, 1500)
      } else {
        if (historyColors && historyColors.length > 0) {
          chrome.storage.local.set({
            history: [...historyColors, colorInfo],
          })
        } else {
          chrome.storage.local.set({ history: [colorInfo] })
        }
        colorAddedToHistory.style.display = 'block'
        setTimeout(() => {
          colorAddedToHistory.style.display = 'none'
        }, 1500)
        showHistoryColors()
      }
    })
  }
  const setColorValues = (hexcode, colorname, rgb, hsl, hsv) => {
    const selectedColorElem = document.querySelector('.selected-color')
    const selectedColorNameElem = document.querySelector('.selected-color-name')
    const rgbColorElem = document.querySelectorAll('.rgb')
    const hsvColorElem = document.querySelectorAll('.hsv')
    const hslColorElem = document.querySelectorAll('.hsl')
    selectedColorElem.style.backgroundColor = `#${hexcode}`

    selectedColorNameElem.textContent = colorname ?? 'Color Name'

    hexColorElem.value = `#${hexcode}`

    rgbColorElem[0].textContent = rgb.r
    rgbColorElem[1].textContent = rgb.g
    rgbColorElem[2].textContent = rgb.b

    hslColorElem[0].textContent = hsl.hh
    hslColorElem[1].textContent = hsl.ss
    hslColorElem[2].textContent = hsl.l

    hsvColorElem[0].textContent = hsv.h
    hsvColorElem[1].textContent = hsv.s
    hsvColorElem[2].textContent = hsv.v
  }

  function isValidHexCode(color) {
    if (color.charAt(0) !== '#' && color.length !== 7) {
      return false
    }
    // Check if each character is a valid hex digit
    for (var i = 1; i < 7; i++) {
      var c = color.charAt(i)
      if (!/[0-9a-fA-F]/.test(c)) {
        return false
      }
    }
    // If all checks passed, the color is valid
    return true
  }

  const fetchColorValues = async (hexcode) => {
    const response = await fetch(
      `https://www.thecolorapi.com/id?hex=${hexcode}`
    )
    const data = await response.json()
    const colorName = data.name.value
    const { r, g, b } = data.rgb
    const { h, s, v } = data.hsv
    const { h: hh, s: ss, l } = data.hsl

    return (colorInfo = {
      colorname: colorName,
      hexcode,
      rgb: {
        r,
        g,
        b,
      },
      hsv: {
        h,
        s,
        v,
      },
      hsl: {
        hh,
        ss,
        l,
      },
    })
  }

  function showBadge() {
    try {
      chrome.storage.local.get(['history'], (res) => {
        const historyColors = res.history ?? []
        if (historyColors.length > 0) {
          const hexcode = historyColors[historyColors.length - 1].hexcode
          const lastPickedColor = hexcode ?? '#fff'
          chrome.action.setBadgeText({ text: ' ' })
          chrome.action.setBadgeBackgroundColor({
            color: lastPickedColor ? `#${lastPickedColor}` : '#FFF',
          })
        } else {
          chrome.action.setBadgeText({ text: ' ' })
          chrome.action.setBadgeBackgroundColor({
            color: '#FFF',
          })
        }
      })
    } catch (e) {
      console.log(e)
    }
  }

  addCustomHexCode.addEventListener('click', addHexCode)
  showBadge()
  showHistoryColors()
  checkEyedropperSupport()
  changeUIOfPickerTab()
  changeUIOfPickerTabWithHex()
})
