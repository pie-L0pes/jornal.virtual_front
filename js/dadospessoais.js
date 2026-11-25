
(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    const raizApi = (
        typeof API_URL !== "undefined"
            ? API_URL
            : "https://jornalvirtual-git-main-biaams-sys1.vercel.app"
    ).replace(/\/+$/, "");

    const nomeUsuario = document.getElementById("nomeUsuario");
    const emailUsuario = document.getElementById("emailUsuario");

    function lerToken() {
        if (typeof window.obterUsuarioToken === "function") {
            return window.obterUsuarioToken();
        }

        if (!token) return null;

        try {
            const partes = token.split(".");

            if (partes.length !== 3) return null;

            const parte = partes[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            const bytes = atob(
                parte.padEnd(Math.ceil(parte.length / 4) * 4, "=")
            );

            const usuario = JSON.parse(
                decodeURIComponent(
                    Array.from(bytes, c =>
                        `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`
                    ).join("")
                )
            );

            if (
                typeof usuario.exp === "number" &&
                usuario.exp * 1000 <= Date.now()
            ) {
                return null;
            }

            return usuario;
        } catch (erro) {
            console.error("Erro ao ler token:", erro);
            return null;
        }
    }

    function mostrarDados(nome, email) {
        if (nomeUsuario) {
            nomeUsuario.textContent = nome;
        }

        if (emailUsuario) {
            emailUsuario.textContent = email;
        }
    }

    async function carregarDadosPessoais() {
        const usuarioLogado = lerToken();

        if (!usuarioLogado?.id) {
            mostrarDados(
                "Usuário não autenticado",
                "Faça login para visualizar seus dados."
            );
            return;
        }

        mostrarDados(
            usuarioLogado.nome || "Carregando...",
            "Carregando..."
        );

        try {
            const resposta = await fetch(
                `${raizApi}/usuarios/buscar/${usuarioLogado.id}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem ||
                    dados.erro ||
                    dados.error ||
                    `Erro ${resposta.status}: não foi possível carregar os dados pessoais.`
                );
            }

            const usuario = dados.usuario || dados;

            mostrarDados(
                usuario.nome || usuarioLogado.nome || "Não informado",
                usuario.email || "Não informado"
            );
        } catch (erro) {
            console.error("Erro ao carregar dados pessoais:", erro);

            mostrarDados(
                usuarioLogado.nome || "Não foi possível carregar",
                "Não foi possível carregar o e-mail"
            );
        }
    }

    carregarDadosPessoais();
})();
