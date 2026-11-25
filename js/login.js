
(() => {
    const senha = document.getElementById("senha");
    const botaoMostrar = document.getElementById("mostrarSenha");
    const formLogin = document.getElementById("formLogin");
    const lembrarMe = document.getElementById("lembrarMe");

    const apiUrl = (
        typeof API_URL !== "undefined"
            ? API_URL
            : "https://jornalvirtual-git-main-biaams-sys1.vercel.app"
    ).replace(/\/+$/, "");

    if (botaoMostrar && senha) {
        botaoMostrar.innerHTML = '<i class="fa-regular fa-eye"></i>';

        botaoMostrar.addEventListener("click", () => {
            if (senha.type === "password") {
                senha.type = "text";
                botaoMostrar.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
            } else {
                senha.type = "password";
                botaoMostrar.innerHTML = '<i class="fa-regular fa-eye"></i>';
            }
        });
    }

    if (formLogin) {
        formLogin.addEventListener("submit", async event => {
            event.preventDefault();

            const email = document.getElementById("email")?.value.trim();
            const senhaValor = senha?.value;
            const botaoEntrar = formLogin.querySelector(".botao-entrar");

            if (!email || !senhaValor) {
                alert("Preencha o e-mail e a senha.");
                return;
            }

            if (botaoEntrar) {
                botaoEntrar.disabled = true;
                botaoEntrar.textContent = "Entrando...";
            }

            try {
                const resposta = await fetch(
                    `${apiUrl}/usuarios/login`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email,
                            senha: senhaValor
                        })
                    }
                );

                const dados = await resposta.json().catch(() => ({}));

                if (!resposta.ok) {
                    throw new Error(
                        dados.mensagem ||
                        dados.erro ||
                        dados.error ||
                        "E-mail ou senha inválidos."
                    );
                }

                if (!dados.token) {
                    throw new Error(
                        "O servidor não retornou um token."
                    );
                }

                localStorage.removeItem("token");
                sessionStorage.removeItem("token");

                if (lembrarMe?.checked) {
                    localStorage.setItem("token", dados.token);
                } else {
                    sessionStorage.setItem("token", dados.token);
                }

                alert(
                    dados.mensagem ||
                    "Login realizado com sucesso!"
                );

                window.location.href = "/html/inicio.html";
            } catch (erro) {
                console.error("Erro no login:", erro);

                alert(
                    erro instanceof TypeError
                        ? "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
                        : erro.message
                );
            } finally {
                if (botaoEntrar) {
                    botaoEntrar.disabled = false;
                    botaoEntrar.textContent = "Entrar";
                }
            }
        });
    }
})();
