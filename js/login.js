const senha = document.getElementById("senha");
const botaoMostrar = document.getElementById("mostrarSenha");
const formLogin = document.getElementById("formLogin");
const lembrarMe = document.getElementById("lembrarMe");

botaoMostrar.innerHTML = '<i class="fa-regular fa-eye"></i>';

botaoMostrar.addEventListener("click", function () {
    if (senha.type === "password") {
        senha.type = "text";
        botaoMostrar.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
    } else {
        senha.type = "password";
        botaoMostrar.innerHTML = '<i class="fa-regular fa-eye"></i>';
    }
});

formLogin.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senhaValor = senha.value;
    const botaoEntrar = formLogin.querySelector(".botao-entrar");

    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";

    try {
        const resposta = await fetch("http://localhost:3000/usuarios/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                senha: senhaValor
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.mensagem || "E-mail ou senha inválidos.");
            return;
        }

        if (!dados.token) {
            alert("O servidor não retornou um token.");
            return;
        }

        localStorage.removeItem("token");
        sessionStorage.removeItem("token");

        if (lembrarMe.checked) {
            localStorage.setItem("token", dados.token);
        } else {
            sessionStorage.setItem("token", dados.token);
        }

        alert(dados.mensagem || "Login realizado com sucesso!");

        window.location.href = "/html/inicio.html";
    } catch (erro) {
        console.error("Erro no login:", erro);
        alert("Não foi possível conectar ao servidor!");
    } finally {
        botaoEntrar.disabled = false;
        botaoEntrar.textContent = "Entrar";
    }
});
