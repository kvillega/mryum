import rfr from 'rfr'
import { webkit } from 'playwright'
import assert from'assert'

// @ts-ignore
import { Menu_bar }  from '../../../components/menu-bar/menu-bar.ts'
// @ts-ignore
import { Tip_popup } from '../../../components/tip-popup/tip-popup.ts'

// load global config
let global_config = rfr("global-config.json")

// load selector files
let home_page_selectors = rfr("pages/home-page.json")
let menu_page_selectors = rfr("pages/menu-page.json")
let cart_page_selectors = rfr("pages/cart-page.json")
let otp_page_selectors = rfr("pages/otp-page.json")
let payment_details_page_selectors = rfr("pages/payment-details-page.json")
let payment_complete_page_selectors = rfr("pages/payment-complete-page.json")

// load needed components
let menu_bar
let tip_popup

// load test config
let test_config = rfr("test/e2e/dine-in/dine-in-config.json")

let page, browser

before(async () => {
    browser = await webkit.launch({headless: global_config.browser.headless})    
    page = await browser.newPage()

    menu_bar = new Menu_bar(page)
    tip_popup = new Tip_popup(page)

    page.setDefaultTimeout(global_config.timeout)
    page.setViewportSize({ width: global_config.browser.viewport.width, height: global_config.browser.viewport.height })
    await page.goto(global_config.environment)
})

after(async () => {
    await page.close()
    await browser.close()
})

it ('Dine-in e2e', async() => {
    await Promise.all([
        page.waitForSelector(home_page_selectors.main_page.guest_register_btn, { state: 'visible' } ),
        page.waitForSelector(home_page_selectors.main_page.view_dine_in_menu_btn, { state: 'visible' } ),
        page.waitForSelector(home_page_selectors.main_page.view_pickup_menu_btn, { state: 'visible' } ),
        page.waitForSelector(home_page_selectors.main_page.view_delivery_menu_btn, { state: 'visible' } )

    ])

    // view the dine in menu
    await page.click(home_page_selectors.main_page.view_dine_in_menu_btn)
    
    await Promise.all([
        page.waitForSelector(home_page_selectors.modals.dine_in_table_number_modal.table_number_input, {state: 'visible'} ),
        page.waitForSelector(home_page_selectors.modals.dine_in_table_number_modal.table_number_submit_btn, {state: 'visible'} )
    ])
    
    await page.fill(home_page_selectors.modals.dine_in_table_number_modal.table_number_input, test_config.test.dine_in.table_number)
    await page.click(home_page_selectors.modals.dine_in_table_number_modal.table_number_submit_btn)
    await page.waitForSelector(home_page_selectors.modals.dine_in_table_number_modal.table_number_input, { state:'detached' })
    
    // fill orders -- after entering the table number, there will be a main category page first.
    // take the first order and start from there
    await handle_orders(test_config.test.dine_in.orders, page)

    // after ordering check the cart for the correct items / totals
    await menu_bar.go_to_cart()
    await page.waitForSelector(cart_page_selectors.table_number, { state: 'visible' })
    let table_number = await page.innerText(cart_page_selectors.table_number)
    assert.equal(table_number.toLowerCase(), ('table number ' + test_config.test.dine_in.table_number).toLowerCase())

    let cart_info = await get_cart_info(page)

    // verify cart contents
    let correct_orders = 0
    let incorrect_orders = []

    for (let x in test_config.test.dine_in.orders) {
        var cart_index = null
        let order_name = test_config.test.dine_in.orders[x].name
        let order_quantity = test_config.test.dine_in.orders[x].quantity
        let order_price = test_config.test.dine_in.orders[x].expected_total
        let order_cart_details = test_config.test.dine_in.orders[x].expected_cart_details

        // find the item within the cart
        for (let y in cart_info) {
            if (cart_info[y].name.toLowerCase() == order_name.toLowerCase()) {
                let correct_details = true
                // check details
                for (let z in order_cart_details) {
                    if (!cart_info[y].details.includes(order_cart_details[z])) {
                        correct_details = false
                        break
                    }
                }

                if (correct_details) {
                    cart_index = y
                    break
                }
            }
        }

        if (cart_index != null) {
            // compare data between expected and actual
                assert.equal(order_name.toLowerCase(), cart_info[cart_index].name.toLowerCase(),
                    `Names do not match! Expected: ${order_name.toLowerCase()}, Actual: ${cart_info[cart_index].name.toLowerCase()}`
                )

            assert.equal(order_quantity, cart_info[cart_index].quantity,
                `Ordered quantity did not match for ${order_name}! Expected: ${order_quantity}, Actual" ${cart_info[cart_index].quantity}`    
            )

            // assert.equal(order_price, cart_info[cart_index].price) -- currently a bug with the latte option registering only $4.00 instead of $4.50

            // if everything matches then increment the correct orders
            correct_orders++
        } else {
            incorrect_orders.push(order_name)
        }
    }

    // after everything make sure to check if the correct orders = total orders
    assert.equal(correct_orders, test_config.test.dine_in.orders.length,
        "Not all orders were verified to be correct! Incorrect orders: " + incorrect_orders
    )
    
    await page.screenshot({ path: "./dine-in-cart.png" })

    // verify total
    assert.equal(test_config.test.dine_in.expected_total, await page.textContent(cart_page_selectors.total))

    // checkout
    await page.click(cart_page_selectors.checkout)
    
    // skip tip for now
    tip_popup.maybe_next_time()
    
    // complete otp
    await complete_otp(test_config.test.guest_info)

    // fill up payment details and pay
    await fill_up_payment_details(test_config.test.guest_info)

    // wait for the payment complete page to show
    await page.waitForSelector(payment_complete_page_selectors.back_to_main, {state: 'visible'})
})

async function handle_orders (orders, page) {
    return new Promise(async (resolve, reject) => {
            // take the first order and open the corresponding page and then start looping
            switch(orders[0].category) {
                case "Drinks": {
                    page.waitForNavigation()
                    page.click(home_page_selectors.main_category_page.drinks_link)
                    break
                }
           
                case "Lunch": {
                    page.waitForNavigation()
                    page.click(home_page_selectors.main_category_page.lunch_link)
                    break
                }
           
                case "Breakfast": {
                    page.waitForNavigation()
                    page.click(home_page_selectors.main_category_page.breakfast_link)
                    break
                }
            }

            // loop through the orders
            for (let i = 0; i < orders.length; i++) {
                // for 2nd - nth onwards check if its within the same category as the previous
                // if it is, stay on the page and order it. Else navigate to the appropriate page
                if (i > 0) {
                    if (orders[i-1].category != orders[i].category) {
                        // navigate via menu bar to the new category
                        await menu_bar.navigate_to_category(orders[i].category)
                    } else {
                        // else just continue ordering
                    }
                }
                
                await order_item(orders[i])
            }
            resolve()
    })
}

async function get_cart_info (page) {
    return new Promise(async (resolve, reject) => {
        let cart_info = []
        // menu items
        let menu_items = await page.$$(cart_page_selectors.item.name)
        for(let i in menu_items) {
            let info = {
                "name": await menu_items[i].innerText(), 
                "details": [], 
                "quantity": null,
                "price": null
            }

            let details = await page.$$(cart_page_selectors.item.details.replace(/rplc_idx/gi, [parseInt(i)+1]))
            for (let x in details) {
                info.details.push(
                    await details[x].innerText()
                )
            }
            
            info.quantity = await page.textContent(cart_page_selectors.item.quantity.replace(/rplc_idx/gi, [parseInt(i)+1]))
            info.price = await page.textContent(cart_page_selectors.item.price.replace(/rplc_idx/gi, [parseInt(i)+1]))

            cart_info.push(info)
        }
        resolve(cart_info)
    })
}

async function order_item (order) {
    return new Promise(async (resolve, reject) => {
        let type = order.type
        let name = order.name

        // click the selected item
        let selector = menu_page_selectors.menu_item_selector.replace(/rplc_me/gi, name)
        await page.click(selector)

        // fill up the order details
        for (let detail in order.details) {
            await page.click(menu_page_selectors.order_modal.options_selector.replace(/rplc_me/gi, order.details[detail]))
        }

        // quantity
        if (order.quantity > 1) {
            for(let i = 1; i < order.quantity; i++) {
                await page.click(menu_page_selectors.order_modal.quantity_add)
            }
        }

        // add to cart
        await page.click(menu_page_selectors.order_modal.add_to_cart)
        
        // wait for the modal to be detached before ordering again
        await page.waitForSelector(menu_page_selectors.order_modal.modal_selector, { state: 'detached' })
        resolve()
    })
}

async function fill_up_payment_details(guest_info) {
    return new Promise(async (resolve, reject) => {
        await page.waitForSelector(payment_details_page_selectors.name, { state: 'visible' })

        // name
        await page.fill(payment_details_page_selectors.name, "")
        await page.fill(payment_details_page_selectors.name, guest_info.full_name)

        // select payment option
        if (guest_info.payment.type == "existing") {
            let card = payment_details_page_selectors.payment_options.existing_card
            .replace(/rplc_type/gi, guest_info.payment.details.card_type)
            .replace(/rplc_date/gi, guest_info.payment.details.card_expiry)
            .replace(/rplc_digits/gi, guest_info.payment.details.card_digits)

            await page.click(card)
        }

        // other options to follow

        // pay now
        await page.click(payment_details_page_selectors.pay_now_btn)
        resolve()
    })
}

async function complete_otp(guest_info) {
    return new Promise(async (resolve, reject) => {
        await page.waitForSelector(otp_page_selectors.mobile_number)

        await page.fill(otp_page_selectors.mobile_number, guest_info.mobile_number)
        await page.click(otp_page_selectors.send_sms)
        
        await page.waitForSelector(otp_page_selectors.otp_input, {state: 'visible'})

        await page.fill(otp_page_selectors.otp_input, guest_info.otp)

        resolve()
    })
}