// This is the JavaScript code for loginTranslators.html
// It's stored in a separate file, so we can minify it.
// If you change something here, minify the file and copy
// the contents of loginTranslators.min.js inside the <script>
// tags in loginTranslators.min.html before deploying.

/* eslint-disable */
if (typeof window.orientation !== "undefined") document.getElementById("mobile-warning").style.display = "block"
else if (!window.chrome) document.getElementById("chrome-warning").style.display = "block"

const appURL = window.location
function hash(r) {
    function a(r, n) {
        var t, o, e, u, f
        return (
            (e = 2147483648 & r),
            (u = 2147483648 & n),
            (f = (1073741823 & r) + (1073741823 & n)),
            (t = 1073741824 & r) & (o = 1073741824 & n) ? 2147483648 ^ f ^ e ^ u : t | o ? (1073741824 & f ? 3221225472 ^ f ^ e ^ u : 1073741824 ^ f ^ e ^ u) : f ^ e ^ u
        )
    }
    function n(r, n, t, o, e, u, f) {
        return (r = a(r, a(a((n & t) | (~n & o), e), f))), a((r << u) | (r >>> (32 - u)), n)
    }
    function t(r, n, t, o, e, u, f) {
        return (r = a(r, a(a((n & o) | (t & ~o), e), f))), a((r << u) | (r >>> (32 - u)), n)
    }
    function o(r, n, t, o, e, u, f) {
        return (r = a(r, a(a(n ^ t ^ o, e), f))), a((r << u) | (r >>> (32 - u)), n)
    }
    function e(r, n, t, o, e, u, f) {
        return (r = a(r, a(a(t ^ (n | ~o), e), f))), a((r << u) | (r >>> (32 - u)), n)
    }
    function u(r) {
        var n,
            t = "",
            o = ""
        for (n = 0; n <= 3; n++) t += (o = "0" + (o = (r >>> (8 * n)) & 255).toString(16)).substr(o.length - 2, 2)
        return t
    }
    var f, i, C, c, g, h, d, m, v
    r += 2147483648
    for (
        f = (function (r) {
            for (var n, t = r.length, o = 16 * (((n = t + 8) - (n % 64)) / 64 + 1), e = Array(o - 1), u = 0, f = 0; f < t; )
                (u = (f % 4) * 8), (e[(n = (f - (f % 4)) / 4)] |= r.charCodeAt(f) << u), f++
            return (e[(n = (f - (f % 4)) / 4)] |= 128 << ((f % 4) * 8)), (e[o - 2] = t << 3), (e[o - 1] = t >>> 29), e
        })(
            (r = (function (r) {
                r = r.replace(/\r\n/g, "\n")
                for (var n = "", t = 0; t < r.length; t++) {
                    var o = r.charCodeAt(t)
                    o < 128
                        ? (n += String.fromCharCode(o))
                        : (127 < o && o < 2048
                              ? (n += String.fromCharCode((o >> 6) | 192))
                              : ((n += String.fromCharCode((o >> 12) | 224)), (n += String.fromCharCode(((o >> 6) & 63) | 128))),
                          (n += String.fromCharCode((63 & o) | 128)))
                }
                return n
            })(r))
        ),
            h = 1732584193,
            d = 4023233417,
            m = 2562383102,
            v = 271733878,
            r = 0;
        r < f.length;
        r += 16
    )
        (h = n((i = h), (C = d), (c = m), (g = v), f[r + 0], 7, 3614090360)),
            (v = n(v, h, d, m, f[r + 1], 12, 3905402710)),
            (m = n(m, v, h, d, f[r + 2], 17, 606105819)),
            (d = n(d, m, v, h, f[r + 3], 22, 3250441966)),
            (h = n(h, d, m, v, f[r + 4], 7, 4118548399)),
            (v = n(v, h, d, m, f[r + 5], 12, 1200080426)),
            (m = n(m, v, h, d, f[r + 6], 17, 2821735955)),
            (d = n(d, m, v, h, f[r + 7], 22, 4249261313)),
            (h = n(h, d, m, v, f[r + 8], 7, 1770035416)),
            (v = n(v, h, d, m, f[r + 9], 12, 2336552879)),
            (m = n(m, v, h, d, f[r + 10], 17, 4294925233)),
            (d = n(d, m, v, h, f[r + 11], 22, 2304563134)),
            (h = n(h, d, m, v, f[r + 12], 7, 1804603682)),
            (v = n(v, h, d, m, f[r + 13], 12, 4254626195)),
            (m = n(m, v, h, d, f[r + 14], 17, 2792965006)),
            (h = t(h, (d = n(d, m, v, h, f[r + 15], 22, 1236535329)), m, v, f[r + 1], 5, 4129170786)),
            (v = t(v, h, d, m, f[r + 6], 9, 3225465664)),
            (m = t(m, v, h, d, f[r + 11], 14, 643717713)),
            (d = t(d, m, v, h, f[r + 0], 20, 3921069994)),
            (h = t(h, d, m, v, f[r + 5], 5, 3593408605)),
            (v = t(v, h, d, m, f[r + 10], 9, 38016083)),
            (m = t(m, v, h, d, f[r + 15], 14, 3634488961)),
            (d = t(d, m, v, h, f[r + 4], 20, 3889429448)),
            (h = t(h, d, m, v, f[r + 9], 5, 568446438)),
            (v = t(v, h, d, m, f[r + 14], 9, 3275163606)),
            (m = t(m, v, h, d, f[r + 3], 14, 4107603335)),
            (d = t(d, m, v, h, f[r + 8], 20, 1163531501)),
            (h = t(h, d, m, v, f[r + 13], 5, 2850285829)),
            (v = t(v, h, d, m, f[r + 2], 9, 4243563512)),
            (m = t(m, v, h, d, f[r + 7], 14, 1735328473)),
            (h = o(h, (d = t(d, m, v, h, f[r + 12], 20, 2368359562)), m, v, f[r + 5], 4, 4294588738)),
            (v = o(v, h, d, m, f[r + 8], 11, 2272392833)),
            (m = o(m, v, h, d, f[r + 11], 16, 1839030562)),
            (d = o(d, m, v, h, f[r + 14], 23, 4259657740)),
            (h = o(h, d, m, v, f[r + 1], 4, 2763975236)),
            (v = o(v, h, d, m, f[r + 4], 11, 1272893353)),
            (m = o(m, v, h, d, f[r + 7], 16, 4139469664)),
            (d = o(d, m, v, h, f[r + 10], 23, 3200236656)),
            (h = o(h, d, m, v, f[r + 13], 4, 681279174)),
            (v = o(v, h, d, m, f[r + 0], 11, 3936430074)),
            (m = o(m, v, h, d, f[r + 3], 16, 3572445317)),
            (d = o(d, m, v, h, f[r + 6], 23, 76029189)),
            (h = o(h, d, m, v, f[r + 9], 4, 3654602809)),
            (v = o(v, h, d, m, f[r + 12], 11, 3873151461)),
            (m = o(m, v, h, d, f[r + 15], 16, 530742520)),
            (h = e(h, (d = o(d, m, v, h, f[r + 2], 23, 3299628645)), m, v, f[r + 0], 6, 4096336452)),
            (v = e(v, h, d, m, f[r + 7], 10, 1126891415)),
            (m = e(m, v, h, d, f[r + 14], 15, 2878612391)),
            (d = e(d, m, v, h, f[r + 5], 21, 4237533241)),
            (h = e(h, d, m, v, f[r + 12], 6, 1700485571)),
            (v = e(v, h, d, m, f[r + 3], 10, 2399980690)),
            (m = e(m, v, h, d, f[r + 10], 15, 4293915773)),
            (d = e(d, m, v, h, f[r + 1], 21, 2240044497)),
            (h = e(h, d, m, v, f[r + 8], 6, 1873313359)),
            (v = e(v, h, d, m, f[r + 15], 10, 4264355552)),
            (m = e(m, v, h, d, f[r + 6], 15, 2734768916)),
            (d = e(d, m, v, h, f[r + 13], 21, 1309151649)),
            (h = e(h, d, m, v, f[r + 4], 6, 4149444226)),
            (v = e(v, h, d, m, f[r + 11], 10, 3174756917)),
            (m = e(m, v, h, d, f[r + 2], 15, 718787259)),
            (d = e(d, m, v, h, f[r + 9], 21, 3951481745)),
            (h = a(h, i)),
            (d = a(d, C)),
            (m = a(m, c)),
            (v = a(v, g))
    return (u(h) + u(d) + u(m) + u(v)).toLowerCase()
}

let isLoggingIn = false
const storedUsername = getCookie("lu")
const storedPassword = getCookie("lp")

if (storedUsername && storedPassword) {
    $("#logging-in").show()
    doLogin(storedUsername, storedPassword)
} else {
    showLoginCard()
}

function showLoginCard() {
    setTimeout(() => {
        $(".ui.card").transition("fade down")
        $("#username").focus()
    }, 200)
}

$(".ui.checkbox").checkbox()

function doLogin(username, password) {
    $("#connection-failed").addClass("hidden")
    $("#login-failed").addClass("hidden")
    $("#pending-account").addClass("hidden")
    $("#suspended-account").addClass("hidden")

    if (!username || !password) {
        if (username) $("#password").focus()
        else $("#username").focus()
        return
    }

    if (isLoggingIn) return
    isLoggingIn = true

    axios
        .post(appURL, {
            username: username,
            password: password
        })
        .then(response => {
            isLoggingIn = false
            if (response.status != 200) {
                $("#connection-failed").removeClass("hidden")
                return
            }

            if (response.data === "FAILED") {
                $("#password").val("")
                if ($("#logging-in").is(":visible")) {
                    $("#logging-in").hide()
                    showLoginCard()
                } else {
                    $("#login-failed").removeClass("hidden")
                    $("#login-failed-text").text("Please try again.")
                }
                document.cookie = "lp="
            } else if (response.data === "DISABLED") {
                $("#password").val("")
                if ($("#logging-in").is(":visible")) {
                    $("#logging-in").hide()
                    showLoginCard()
                } else {
                    $("#login-failed").removeClass("hidden")
                    $("#login-failed-text").text("Your account has been disabled.")
                }
                document.cookie = "lp="
            } else if (response.data === "PENDING") {
                $("#password").val("")
                if ($("#logging-in").is(":visible")) {
                    $("#logging-in").hide()
                    showLoginCard()
                } else {
                    $("#pending-account").removeClass("hidden")
                }
            } else if (response.data === "SUSPENDED") {
                $("#password").val("")
                if ($("#logging-in").is(":visible")) {
                    $("#logging-in").hide()
                    showLoginCard()
                } else {
                    $("#suspended-account").removeClass("hidden")
                }
            } else {
                if ($("#remember-checkbox").is(":checked")) {
                    document.cookie = "lu=" + username
                    document.cookie = "lp=" + password
                }
                if (typeof response.data === "object" && response.data.agreement) {
                    $("body").empty()
                    $("body").append(response.data.agreement)
                } else {
                    isLogginIn = true
                    postToken(appURL, response.data)
                }
            }
        })
        .catch(() => {
            isLoggingIn = false
            $("#connection-failed").removeClass("hidden")
        })
}

function postToken(url, loginToken) {
    sessionStorage.setItem("tt", loginToken)
    var form = $(`<form action="${url}" method="post"><input type="hidden" name="t" value="${loginToken}" /></form>`)
    $("body").append(form)
    form.submit()
}

function doLoginWithFormData() {
    const username = $("#username").val()
    const password = $("#password").val()
    doLogin(username, hash(password))
}

$("#password").keypress(function (e) {
    if (e.which == 13) doLoginWithFormData()
})

$("#login-button").click(function () {
    doLoginWithFormData()
})

function getCookie(cookieName) {
    let name = cookieName + "="
    let ca = decodeURIComponent(document.cookie).split(";")
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) == " ") c = c.substring(1)
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length)
    }
    return ""
}
