const header = document.getElementById("header");

addEventListener("DOMContentLoaded", () => {
    fetch("header.html")
        .then(res => res.text())
        .then(data => {
            if(header){
                header.innerHTML = data;
            }
        })
        .catch(err => {
            throw new Error("header not loadded")
        }
        );
})