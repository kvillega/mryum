// menu bar functionalities

import rfr from 'rfr'

let menu_bar_selectors = rfr('/components/menu-bar/menu-bar.json')

let page

class Menu_bar {
    constructor(_page) {
        page = _page
    }

    async navigate_to_category(name) {
        await page.click(menu_bar_selectors.main.view_menu_btn)
        await page.click(menu_bar_selectors.menu_sidebar.category_selector.replace(/rplc_me/gi, name))
    }

    async go_to_cart() {
        await Promise.all([
            page.waitForNavigation(),
            page.click(menu_bar_selectors.main.cart_btn)
        ])
    }
}

export { Menu_bar }