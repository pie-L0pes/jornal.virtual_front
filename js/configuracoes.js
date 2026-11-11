const itemAdministracao = document.getElementById("itemAdministracao");
const token = localStorage.getItem("token") || sessionStorage.getItem("token");

function verificarAdministrador() {
    if (!itemAdministracao || !token) {
        itemAdministracao?.remove();
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));

        if (payload.tipo !== "ADMINISTRADOR") {
            itemAdministracao.remove();
        }
    } catch (erro) {
        console.error("Não foi possível verificar o usuário.", erro);
        itemAdministracao?.remove();
    }
}

document.addEventListener("DOMContentLoaded", verificarAdministrador);
document.getElementById("sairConta").addEventListener("click", function (event) {
    event.preventDefault();

    localStorage.removeItem("token");
    sessionStorage.removeItem("token");

    window.location.href = "/html/login.html";
});