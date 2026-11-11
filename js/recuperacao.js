
const API_URL = "http://localhost:3000/usuarios";

const formEsqueciSenha = document.getElementById("formEsqueciSenha");
const formRedefinirSenha = document.getElementById("formRedefinirSenha");
const mensagem = document.getElementById("mensagem");

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
}

async function enviarRequisicao(url, dados) {
    const resposta = await fetch(`${API_URL}${url}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(resultado.mensagem || "Não foi possível concluir a solicitação.");
    }

    return resultado;
}

if (formEsqueciSenha) {
    formEsqueciSenha.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const botao = formEsqueciSenha.querySelector(".botao-entrar");

        botao.disabled = true;
        botao.textContent = "Enviando...";

        try {
            const resultado = await enviarRequisicao("/esqueci-senha", {
                email
            });

            mostrarMensagem(
                resultado.mensagem || "Se o e-mail estiver cadastrado, você receberá um link de recuperação.",
                "sucesso"
            );

            formEsqueciSenha.reset();
        } catch (erro) {
            mostrarMensagem(erro.message, "erro");
        } finally {
            botao.disabled = false;
            botao.textContent = "Enviar link de recuperação";
        }
    });
}

if (formRedefinirSenha) {
    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("token");
    const botao = formRedefinirSenha.querySelector(".botao-entrar");

    if (!token) {
        mostrarMensagem("Link de recuperação inválido. Solicite um novo.", "erro");
        botao.disabled = true;
    } else {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    formRedefinirSenha.addEventListener("submit", async (event) => {
        event.preventDefault();

        const senha = document.getElementById("novaSenha").value;
        const confirmarSenha = document.getElementById("confirmarSenha").value;

        if (senha.length < 8) {
            mostrarMensagem("A senha precisa ter pelo menos 8 caracteres.", "erro");
            return;
        }

        if (senha !== confirmarSenha) {
            mostrarMensagem("As senhas não coincidem.", "erro");
            return;
        }

        botao.disabled = true;
        botao.textContent = "Redefinindo...";

        try {
            const resultado = await enviarRequisicao("/redefinir-senha", {
                token,
                senha
            });

            mostrarMensagem(
                resultado.mensagem || "Senha redefinida com sucesso!",
                "sucesso"
            );

            formRedefinirSenha.reset();
            botao.textContent = "Senha redefinida";
        } catch (erro) {
            mostrarMensagem(erro.message, "erro");
            botao.disabled = false;
            botao.textContent = "Redefinir senha";
        }
    });
}

document.querySelectorAll(".mostrar-senha").forEach((botao) => {
    const iconeAberto = '<i class="fa-regular fa-eye"></i>';
    const iconeFechado = '<i class="fa-regular fa-eye-slash"></i>';

    botao.innerHTML = iconeAberto;

    botao.addEventListener("click", () => {
        const campo = document.getElementById(botao.dataset.alvo);
        const visivel = campo.type === "password";

        campo.type = visivel ? "text" : "password";
        botao.innerHTML = visivel ? iconeFechado : iconeAberto;
        botao.setAttribute("aria-label", visivel ? "Ocultar senha" : "Mostrar senha");
    });
});
