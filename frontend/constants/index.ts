const appURL = 'https://d1ymi62ieypwzs.cloudfront.net'
const appName = 'Life Game'
const appDescription = 'Life Game is an interactive platform for exploring simulations in the browser.'

// date, then "v1.1 alpha", then a build number — bump the trailing build
// number by hand each time we deploy that same day (reset to .1 the next
// calendar day), so Evan can tell two same-day deploys apart at a glance.
// The "1.1 alpha" part is Evan's call and stays fixed until he says otherwise.
const appVersion = '10.2.2026 v1.1 alpha.3'

export {
    appURL,
    appName,
    appDescription,
    appVersion,
}
