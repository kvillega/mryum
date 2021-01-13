// menu bar functionalities

import rfr from 'rfr'

let tip_popup_selectors = rfr('/components/tip-popup/tip-popup.json')

let page

class Tip_popup {
    constructor(_page) {
        page = _page
    }

    async maybe_next_time() {
        await page.click(tip_popup_selectors.next_time_btn)
    }
}

export { Tip_popup }