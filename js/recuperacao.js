
(() => {
    "use strict";

    const BASE_API = (
        typeof API_URL !== "undefined"
            ? API_URL
            : "https://jornalvirtual-git-main-biaams-sys1.vercel.app"
    ).replace(/\/+$/, "");

    const USUARIOS_API = `${BASE_API}/usuarios`;

    const formEsqueciSenha = document.getElementById("formEsqueciSenha");
    const formRedefinirSenha = document.getElementById("formRedefinirSenha");
    const mensagem = document.getElementById("mensagem");

    function mostrarMensagem(texto, tipo) {
        if (!mensagem) return;

        mensagem.textContent = texto;
        mensagem.className = `mensagem ${tipo}`;
        mensagem.setAttribute("role", "status");
        mensagem.setAttribute("aria-live", "polite");
    }

    async function enviarRequisicao(rota, dados) {
        let resposta;

        try {
            resposta = await fetch(`${USUARIOS_API}${rota}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            });
        } catch {
            throw new Error(
                "Não foi possível conectar ao servidor. Verifique sua conexão."
            );
        }

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                resultado.mensagem ||
                resultado.erro ||
                resultado.error ||
                "Não foi possível concluir a solicitação."
            );
        }

        return resultado;
    }

    if (formEsqueciSenha) {
        formEsqueciSenha.addEventListener("submit", async evento => {
            evento.preventDefault();

            const campoEmail = document.getElementById("email");
            const botao = formEsqueciSenha.querySelector(".botao-entrar");

            if (!campoEmail || !botao || botao.disabled) return;

            const email = campoEmail.value.trim().toLowerCase();

            if (!email) {
                mostrarMensagem("Informe seu e-mail.", "erro");
                return;
            }

            botao.disabled = true;
            botao.textContent = "Enviando...";

            try {
                const resultado = await enviarRequisicao(
                    "/esqueci-senha",
                    { email }
                );

                mostrarMensagem(
                    resultado.mensagem ||
                    "Se o e-mail estiver cadastrado, você receberá um link de recuperação.",
                    "sucesso"
                );

                formEsqueciSenha.reset();
            } catch (erro) {
                console.error("Erro ao solicitar recuperação:", erro);

                mostrarMensagem(
                    erro.message ||
                    "Não foi possível enviar a solicitação.",
                    "erro"
                );
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

        let senhaRedefinida = false;

        if (!token) {
            mostrarMensagem(
                "Link de recuperação inválido. Solicite um novo.",
                "erro"
            );

            if (botao) botao.disabled = true;
        } else {
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );
        }

        formRedefinirSenha.addEventListener("submit", async evento => {
            evento.preventDefault();

            if (!token || senhaRedefinida || !botao || botao.disabled) {
                return;
            }

            const campoSenha = document.getElementById("novaSenha");
            const campoConfirmacao = document.getElementById("confirmarSenha");

            if (!campoSenha || !campoConfirmacao) return;

            const senha = campoSenha.value;
            const confirmarSenha = campoConfirmacao.value;

            if (senha.length < 8) {
                mostrarMensagem(
                    "A senha precisa ter pelo menos 8 caracteres.",
                    "erro"
                );
                return;
            }

            if (senha !== confirmarSenha) {
                mostrarMensagem(
                    "As senhas não coincidem.",
                    "erro"
                );
                return;
            }

            botao.disabled = true;
            botao.textContent = "Redefinindo...";

            try {
                const resultado = await enviarRequisicao(
                    "/redefinir-senha",
                    {
                        token,
                        senha
                    }
                );

                senhaRedefinida = true;

                mostrarMensagem(
                    resultado.mensagem ||
                    "Senha redefinida com sucesso! Você já pode fazer login.",
                    "sucesso"
                );

                formRedefinirSenha.reset();
                botao.textContent = "Senha redefinida";
            } catch (erro) {
                console.error("Erro ao redefinir senha:", erro);

                mostrarMensagem(
                    erro.message ||
                    "Não foi possível redefinir a senha.",
                    "erro"
                );

                botao.disabled = false;
                botao.textContent = "Redefinir senha";
            }
        });
    }

    document.querySelectorAll(".mostrar-senha").forEach(botao => {
        const iconeAberto = '<i class="fa-regular fa-eye"></i>';
        const iconeFechado = '<i class="fa-regular fa-eye-slash"></i>';

        botao.innerHTML = iconeAberto;
        botao.setAttribute("aria-label", "Mostrar senha");

        botao.addEventListener("click", () => {
            const campo = document.getElementById(
                botao.dataset.alvo
            );

            if (!campo) return;

            const visivel = campo.type === "password";

            campo.type = visivel ? "text" : "password";
            botao.innerHTML = visivel ? iconeFechado : iconeAberto;

            botao.setAttribute(
                "aria-label",
                visivel ? "Ocultar senha" : "Mostrar senha"
            );
        });
    });
})();
