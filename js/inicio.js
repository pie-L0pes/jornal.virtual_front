const modal = document.querySelector(".modal");
const fechar = document.querySelector(".close");
const cardsContainer = document.querySelector(".cards");
const pesquisa = document.querySelector(".input-search input");
const banner = document.querySelector(".banner");
const tituloBanner = document.querySelector(".banner-info h1");
const descricaoBanner = document.querySelector(".banner-info p");
const categoriaBanner = document.querySelector(".banner-info .tag");
const botaoAnterior = document.querySelector(".arrow.left");
const botaoProximo = document.querySelector(".arrow.right");
const botaoLerMais = document.querySelector(".btn-banner");
const botaoCriar = document.getElementById("criarNoticia");
const token = localStorage.getItem("token") || sessionStorage.getItem("token");
const apiUrl = (typeof API_URL !== "undefined" ? API_URL : "http://localhost:3000").replace(/\/$/, "");
function noticiasDoBanner() {
    return noticias.slice(0, 6);
}

let noticias = [];
let indiceAtual = 0;
let usuarioAtual = null;

function obterUsuarioToken() {
    if (!token) return null;

    try {
        const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const decodificado = atob(parte.padEnd(Math.ceil(parte.length / 4) * 4, "="));
        const texto = decodeURIComponent(
            Array.from(decodificado, caractere =>
                `%${caractere.charCodeAt(0).toString(16).padStart(2, "0")}`
            ).join("")
        );
        return JSON.parse(texto);
    } catch {
        return null;
    }
}

usuarioAtual = obterUsuarioToken();

const tipoUsuario = usuarioAtual?.tipo;
const administrador = tipoUsuario === "ADMINISTRADOR";
const verificado = tipoUsuario === "VERIFICADO";
const podeCriar = administrador || verificado;

if (!administrador) {
    cardsContainer.classList.add("cards-horizontal");
}

if (podeCriar) {
    botaoCriar.hidden = false;
}

function podeGerenciar(noticia) {
    if (administrador) return true;

    return verificado &&
        Number(noticia.usuarioId) === Number(usuarioAtual?.id);
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatarData(data) {
    if (!data) return "";

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) return "";

    return dataConvertida.toLocaleDateString("pt-BR");
}

function obterImagem(noticia) {
    const midia = noticia.midias?.find(item =>
        item.mimeType?.startsWith("image/")
    );

    if (!midia?.path) return null;

    const caminho = midia.path.replace(/\\/g, "/").replace(/^\/+/, "");

    if (/^https?:\/\//i.test(caminho)) {
        return caminho;
    }

    return `${apiUrl}/${caminho}`;
}

function obterResumo(noticia) {
    return noticia.subtitulo || noticia.texto || "";
}

function limitarTexto(texto, limite = 180) {
    const valor = String(texto || "");

    return valor.length > limite
        ? `${valor.slice(0, limite).trim()}...`
        : valor;
}

function obterAutor(noticia) {
    return noticia.autor?.nome || "Jornal Online";
}

async function requisicao(caminho, opcoes = {}) {
    const resposta = await fetch(`${apiUrl}${caminho}`, {
        ...opcoes,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(opcoes.headers || {})
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            dados.mensagem ||
            dados.erro ||
            dados.error ||
            "Não foi possível realizar a operação."
        );
    }

    return dados;
}

function fecharModal() {
    modal.classList.remove("ativo");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

fechar.addEventListener("click", fecharModal);

modal.addEventListener("click", event => {
    if (event.target === modal) fecharModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") fecharModal();
});

function abrirModal(noticia) {
    if (!noticia) return;

    const imagemModal = modal.querySelector(".imagem-modal");
    const categoriaModal = modal.querySelector(".modal-body .categoria");
    const tituloModal = modal.querySelector(".modal-body h2");
    const subtituloModal = modal.querySelector(".subtitulo-modal");
    const autorModal = modal.querySelector(".modal-body .autor");
    const textoModal = modal.querySelector(".texto-noticia");

    const imagem = obterImagem(noticia);

    imagemModal.hidden = !imagem;

    if (imagem) {
        imagemModal.src = imagem;
        imagemModal.alt = noticia.titulo;
    } else {
        imagemModal.removeAttribute("src");
    }

    categoriaModal.textContent = "NOTÍCIA";
    tituloModal.textContent = noticia.titulo;
    subtituloModal.textContent = noticia.subtitulo || "";
    subtituloModal.hidden = !noticia.subtitulo;

    autorModal.innerHTML = `
        <i class="fa-solid fa-user"></i>
        ${escaparHtml(obterAutor(noticia))}
        •
        ${escaparHtml(formatarData(noticia.dataPublicacao))}
    `;

    textoModal.textContent = noticia.texto || "";

    modal.classList.add("ativo");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    fechar.focus();
}

function atualizarCarrossel(direcao = 1) {
    const destaques = noticiasDoBanner();

    if (destaques.length === 0) {
        tituloBanner.textContent = "Nenhuma notícia publicada";
        descricaoBanner.textContent = "As notícias publicadas aparecerão aqui.";
        categoriaBanner.textContent = "JORNAL ONLINE";

        trocarSlide(noticia);
        return;
    }

    if (indiceAtual >= destaques.length) {
        indiceAtual = 0;
    }

    const noticia = destaques[indiceAtual];

    tituloBanner.textContent = noticia.titulo;
    descricaoBanner.textContent = limitarTexto(obterResumo(noticia), 180);
    categoriaBanner.textContent = "DESTAQUE";

    const imagem = obterImagem(noticia) || "../img/banner-padrao.png";

    trocarSlide(noticia, direcao);
}

function proximaNoticia() {
    const total = noticiasDoBanner().length;
    if (!total || animandoCarrossel) return;

    indiceAtual = (indiceAtual + 1) % total;
    atualizarCarrossel(1);
}

function noticiaAnterior() {
    const total = noticiasDoBanner().length;
    if (!total || animandoCarrossel) return;

    indiceAtual = (indiceAtual - 1 + total) % total;
    atualizarCarrossel(-1);
}

botaoProximo.addEventListener("click", proximaNoticia);
botaoAnterior.addEventListener("click", noticiaAnterior);

setInterval(proximaNoticia, 6000);

botaoLerMais.addEventListener("click", () => {
    const noticia = noticiasDoBanner()[indiceAtual];

    if (noticia) {
        abrirModal(noticia);
    }
});

function criarCard(noticia) {
    const card = document.createElement("article");
    card.classList.add("card");

    const imagem = obterImagem(noticia);

    const imagemHtml = imagem
        ? `<img src="${escaparHtml(imagem)}" alt="${escaparHtml(noticia.titulo)}" loading="lazy">`
        : `
            <div class="card-imagem-vazia">
                <i class="fa-regular fa-image"></i>
            </div>
        `;

    const botoesGerenciamento = podeGerenciar(noticia)
        ? `
            <a class="editar" href="/html/criar.html?id=${noticia.id}">
                <i class="fa-solid fa-pen"></i>
                Editar
            </a>
            <button class="excluir" type="button">
                <i class="fa-solid fa-trash"></i>
                Excluir
            </button>
        `
        : "";

    card.innerHTML = `
        ${imagemHtml}
        <div class="card-body">
            <span class="categoria">NOTÍCIA</span>
            <h3>${escaparHtml(noticia.titulo)}</h3>
            <p>${escaparHtml(limitarTexto(obterResumo(noticia)))}</p>
            <p class="autor-card">
                <i class="fa-solid fa-user"></i>
                ${escaparHtml(obterAutor(noticia))}
                •
                ${escaparHtml(formatarData(noticia.dataPublicacao))}
            </p>
            <div class="buttons">
                <button class="visualizar" type="button">
                    <i class="fa-solid fa-eye"></i>
                    Visualizar
                </button>
                ${botoesGerenciamento}
            </div>
        </div>
    `;

    card.querySelector(".visualizar").addEventListener("click", () => {
        abrirModal(noticia);
    });

    const excluir = card.querySelector(".excluir");

    if (excluir) {
        excluir.addEventListener("click", () => excluirNoticia(noticia));
    }

    return card;
}

function carregarNoticias() {
    cardsContainer.replaceChildren();

    const termo = pesquisa.value.toLocaleLowerCase("pt-BR").trim();

    const noticiasFiltradas = noticias.filter(noticia => {
        const conteudoPesquisa = [
            noticia.titulo,
            noticia.subtitulo,
            noticia.texto,
            obterAutor(noticia)
        ].join(" ").toLocaleLowerCase("pt-BR");

        return conteudoPesquisa.includes(termo);
    });

    if (!noticiasFiltradas.length) {
        const mensagem = document.createElement("div");
        mensagem.className = "estado-noticias";
        mensagem.textContent = noticias.length
            ? "Nenhuma notícia encontrada."
            : "Nenhuma notícia publicada.";
        cardsContainer.appendChild(mensagem);
        return;
    }

    noticiasFiltradas.forEach(noticia => {
        cardsContainer.appendChild(criarCard(noticia));
    });
}

async function excluirNoticia(noticia) {
    if (!podeGerenciar(noticia)) return;

    const confirmar = confirm("Deseja realmente excluir esta notícia?");

    if (!confirmar) return;

    try {
        await requisicao(`/noticias/excluir/${noticia.id}`, {
            method: "DELETE"
        });

        noticias = noticias.filter(item => item.id !== noticia.id);

        if (indiceAtual >= noticias.length) {
            indiceAtual = 0;
        }

        carregarNoticias();
        atualizarCarrossel();
    } catch (erro) {
        alert(erro.message);
    }
}

async function buscarNoticias() {
    cardsContainer.innerHTML = `
        <div class="estado-noticias">
            Carregando notícias...
        </div>
    `;

    try {
        if (!token) {
            throw new Error("Faça login para visualizar as notícias.");
        }

        const dados = await requisicao("/noticias/listar");

        if (Array.isArray(dados)) {
            noticias = dados;
        } else if (Array.isArray(dados.noticias)) {
            noticias = dados.noticias;
        } else {
            throw new Error("Formato de resposta inesperado ao listar notícias.");
        }

        noticias.sort((a, b) =>
            new Date(b.dataPublicacao) - new Date(a.dataPublicacao)
        );

        indiceAtual = 0;
        carregarNoticias();
        atualizarCarrossel();
    } catch (erro) {
        cardsContainer.replaceChildren();

        const mensagem = document.createElement("div");
        mensagem.className = "estado-noticias";
        mensagem.textContent = erro.message;

        cardsContainer.appendChild(mensagem);

        tituloBanner.textContent = "Notícias indisponíveis";
        descricaoBanner.textContent = "Não foi possível carregar as notícias.";
    }
}

pesquisa.addEventListener("input", carregarNoticias);

buscarNoticias();

let slideAtual = null;
let animandoCarrossel = false;

function criarSlide(imagem) {
    const slide = document.createElement("div");
    slide.className = "banner-slide";

    slide.style.backgroundImage = `
        linear-gradient(
            90deg,
            rgba(35, 35, 35, 0.95) 0%,
            rgba(75, 75, 75, 0.70) 40%,
            rgba(130, 130, 130, 0.10) 100%
        ),
        url("${imagem.replace(/["\\\n\r]/g, "")}")
    `;

    return slide;
}

function trocarSlide(noticia, direcao = 1) {
    if (animandoCarrossel) return;

    const imagem = obterImagem(noticia) || "../img/banner-padrao.png";
    const novoSlide = criarSlide(imagem);

    if (!slideAtual) {
        banner.style.backgroundImage = "none";
        banner.prepend(novoSlide);
        slideAtual = novoSlide;
        return;
    }

    animandoCarrossel = true;

    novoSlide.style.transform = `translateX(${direcao * 100}%)`;
    banner.prepend(novoSlide);

    const slideAnterior = slideAtual;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            novoSlide.style.transform = "translateX(0)";
            slideAnterior.style.transform = `translateX(${-direcao * 100}%)`;
        });
    });

    setTimeout(() => {
        slideAnterior.remove();
        slideAtual = novoSlide;
        animandoCarrossel = false;
    }, 650);
}