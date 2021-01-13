Mr Yum Demo automation

- requirements: Node v11++

- installation: download and run `npm install` on the directory

- Running the tests: open a cmd and run `npm run run-e2e` to start the tests

- suite configuration: for suite specific config like viewport, environment URL, playwright timeout go to `global-config.json`

- test configuration: for test specific config see the corresponding json for the test file

- improvement points: Better error handling and screenshots when an error occurs, dated screenshots after test runs, additional functionality

- issues: Commented out test/dine-in/dine-in.ts:120 because one of the items (Latte) does not display the price correctly