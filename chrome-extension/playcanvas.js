!(function () {

    setTimeout(function () {
        let script = document.createElement('script')
        script.src = 'http://localhost:8085/main.build.js'
        script.async = true
        document.body.appendChild(script)
    }, 200)

})()
