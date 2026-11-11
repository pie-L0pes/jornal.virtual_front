const token = localStorage.getItem("token") || sessionStorage.getItem("token");
const raizApi = (typeof API_URL !== "undefined" ? API_URL : "http://localhost:3000").replace(/\/$/, "");

const nomeUsuario = document.getElementById("nomeUsuario");
const emailUsuario = document.getElementById("emailUsuario");

function lerToken() {
    if (!token) return null;

    try {
        const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const bytes = atob(parte.padEnd(Math.ceil(parte.length / 4) * 4, "="));

        return JSON.parse(decodeURIComponent(
            Array.from(bytes, c =>
                `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`
            ).join("")
        ));
    } catch {
        return null;
    }
}

function mostrarDados(nome, email) {
    nomeUsuario.textContent = nome;
    emailUsuario.textContent = email;
}

async function carregarDadosPessoais() {
    const usuarioLogado = lerToken();

    if (!usuarioLogado?.id) {
        mostrarDados("Usuário não autenticado", "Faça login para visualizar seus dados.");
        return;
    }

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
                "Não foi possível carregar os dados pessoais."
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
