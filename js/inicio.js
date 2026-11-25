
(() => {
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

    const apiUrl = (
        typeof API_URL !== "undefined"
            ? API_URL
            : "https://jornalvirtual-git-main-biaams-sys1.vercel.app"
    ).replace(/\/+$/, "");

    let noticias = [];
    let indiceAtual = 0;
    let usuarioAtual = null;
    let slideAtual = null;
    let animandoCarrossel = false;
    let intervaloCarrossel = null;

    function obterUsuarioTokenNoticias() {
        if (!token) return null;

        try {
            const partes = token.split(".");

            if (partes.length !== 3) return null;

            const parte = partes[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            const base64 = parte.padEnd(
                Math.ceil(parte.length / 4) * 4,
                "="
            );

            const decodificado = atob(base64);

            const texto = decodeURIComponent(
                Array.from(decodificado, caractere =>
                    `%${caractere.charCodeAt(0).toString(16).padStart(2, "0")}`
                ).join("")
            );

            const dados = JSON.parse(texto);

            if (
                typeof dados.exp === "number" &&
                dados.exp * 1000 <= Date.now()
            ) {
                return null;
            }

            return dados;
        } catch {
            return null;
        }
    }

    usuarioAtual = obterUsuarioTokenNoticias();

    const tipoUsuario = usuarioAtual?.tipo;
    const administrador = tipoUsuario === "ADMINISTRADOR";
    const verificado = tipoUsuario === "VERIFICADO";
    const podeCriar = administrador || verificado;

    if (!administrador && cardsContainer) {
        cardsContainer.classList.add("cards-horizontal");
    }

    if (botaoCriar) {
        botaoCriar.hidden = !podeCriar;
    }

    function noticiasDoBanner() {
        return noticias.slice(0, 6);
    }

    function podeGerenciar(noticia) {
        if (!usuarioAtual) return false;

        if (administrador) return true;

        return (
            verificado &&
            Number(noticia.usuarioId) === Number(usuarioAtual.id)
        );
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

        if (Number.isNaN(dataConvertida.getTime())) {
            return "";
        }

        return dataConvertida.toLocaleDateString("pt-BR");
    }

    
function obterImagem(noticia) {
    const midia = noticia.midias?.find(item => {
        const tipo = item.mimeType || item.tipo || "";

        return (
            tipo.startsWith("image/") ||
            /\.(png|jpe?g|webp|gif|avif|heic|heif)(\?|$)/i.test(
                item.url || item.path || item.nomeArquivo || ""
            )
        );
    });

    if (!midia) return null;

    const caminhoOriginal =
        midia.url ||
        midia.path ||
        midia.caminho ||
        midia.arquivo ||
        midia.nomeArquivo;

    if (!caminhoOriginal) return null;

    const caminho = String(caminhoOriginal)
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

    if (/^https?:\/\//i.test(caminho)) {
        return caminho;
    }

    const supabaseUrl =
        "https://hepwnbumziimvfugvjbe.supabase.co";

    const caminhoLimpo = caminho.replace(/^midias\//, "");

    return `${supabaseUrl}/storage/v1/object/public/midias/${caminhoLimpo}`;
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
        return (
            noticia.autor?.nome ||
            noticia.usuario?.nome ||
            "Jornal Online"
        );
    }

    async function requisicao(caminho, opcoes = {}) {
        let resposta;

        try {
            resposta = await fetch(`${apiUrl}${caminho}`, {
                ...opcoes,
                headers: {
                    ...(token
                        ? { Authorization: `Bearer ${token}` }
                        : {}),
                    ...(opcoes.headers || {})
                }
            });
        } catch {
            throw new Error(
                "Não foi possível conectar ao servidor."
            );
        }

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem ||
                dados.erro ||
                dados.error ||
                `Erro ${resposta.status}: não foi possível realizar a operação.`
            );
        }

        return dados;
    }

    function fecharModal() {
        if (!modal) return;

        modal.classList.remove("ativo");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    function abrirModal(noticia) {
        if (!noticia || !modal) return;

        const imagemModal = modal.querySelector(".imagem-modal");
        const categoriaModal = modal.querySelector(".modal-body .categoria");
        const tituloModal = modal.querySelector(".modal-body h2");
        const subtituloModal = modal.querySelector(".subtitulo-modal");
        const autorModal = modal.querySelector(".modal-body .autor");
        const textoModal = modal.querySelector(".texto-noticia");

        const imagem = obterImagem(noticia);

        if (imagemModal) {
            imagemModal.hidden = !imagem;

            if (imagem) {
                imagemModal.src = imagem;
                imagemModal.alt = noticia.titulo || "Imagem da notícia";
            } else {
                imagemModal.removeAttribute("src");
            }
        }

        if (categoriaModal) {
            categoriaModal.textContent = "NOTÍCIA";
        }

        if (tituloModal) {
            tituloModal.textContent = noticia.titulo || "";
        }

        if (subtituloModal) {
            subtituloModal.textContent = noticia.subtitulo || "";
            subtituloModal.hidden = !noticia.subtitulo;
        }

        if (autorModal) {
            autorModal.innerHTML = `
                <i class="fa-solid fa-user"></i>
                ${escaparHtml(obterAutor(noticia))}
                •
                ${escaparHtml(formatarData(noticia.dataPublicacao))}
            `;
        }

        if (textoModal) {
            textoModal.textContent = noticia.texto || "";
        }

        modal.classList.add("ativo");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        fechar?.focus();
    }

    function criarSlide(imagem) {
        const slide = document.createElement("div");

        slide.className = "banner-slide";

        const imagemSegura = String(imagem)
            .replace(/["\\\n\r]/g, "");

        slide.style.backgroundImage = `
            linear-gradient(
                90deg,
                rgba(35, 35, 35, 0.95) 0%,
                rgba(75, 75, 75, 0.70) 40%,
                rgba(130, 130, 130, 0.10) 100%
            ),
            url("${imagemSegura}")
        `;

        return slide;
    }

    function trocarSlide(noticia, direcao = 1) {
        if (!banner || animandoCarrossel) return;

        const imagem = noticia
            ? obterImagem(noticia) || "/img/banner-padrao.png"
            : "/img/banner-padrao.png";

        const novoSlide = criarSlide(imagem);

        if (!slideAtual) {
            banner.style.backgroundImage = "none";
            banner.prepend(novoSlide);
            slideAtual = novoSlide;
            return;
        }

        animandoCarrossel = true;

        novoSlide.style.transform =
            `translateX(${direcao * 100}%)`;

        banner.prepend(novoSlide);

        const slideAnterior = slideAtual;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                novoSlide.style.transform = "translateX(0)";
                slideAnterior.style.transform =
                    `translateX(${-direcao * 100}%)`;
            });
        });

        setTimeout(() => {
            slideAnterior.remove();
            slideAtual = novoSlide;
            animandoCarrossel = false;
        }, 650);
    }

    function atualizarCarrossel(direcao = 1) {
        const destaques = noticiasDoBanner();

        if (!destaques.length) {
            if (tituloBanner) {
                tituloBanner.textContent = "Nenhuma notícia publicada";
            }

            if (descricaoBanner) {
                descricaoBanner.textContent =
                    "As notícias publicadas aparecerão aqui.";
            }

            if (categoriaBanner) {
                categoriaBanner.textContent = "JORNAL ONLINE";
            }

            if (botaoLerMais) {
                botaoLerMais.disabled = true;
            }

            if (slideAtual) {
                slideAtual.remove();
                slideAtual = null;
            }

            if (banner) {
                banner.style.backgroundImage = `
                    linear-gradient(
                        90deg,
                        rgba(35, 35, 35, 0.95),
                        rgba(75, 75, 75, 0.70)
                    ),
                    url("/img/banner-padrao.png")
                `;
            }

            return;
        }

        if (indiceAtual >= destaques.length) {
            indiceAtual = 0;
        }

        if (indiceAtual < 0) {
            indiceAtual = destaques.length - 1;
        }

        const noticia = destaques[indiceAtual];

        if (tituloBanner) {
            tituloBanner.textContent = noticia.titulo || "";
        }

        if (descricaoBanner) {
            descricaoBanner.textContent = limitarTexto(
                obterResumo(noticia),
                180
            );
        }

        if (categoriaBanner) {
            categoriaBanner.textContent = "DESTAQUE";
        }

        if (botaoLerMais) {
            botaoLerMais.disabled = false;
        }

        trocarSlide(noticia, direcao);
    }

    function proximaNoticia() {
        const total = noticiasDoBanner().length;

        if (total <= 1 || animandoCarrossel) return;

        indiceAtual = (indiceAtual + 1) % total;

        atualizarCarrossel(1);
    }

    function noticiaAnterior() {
        const total = noticiasDoBanner().length;

        if (total <= 1 || animandoCarrossel) return;

        indiceAtual = (indiceAtual - 1 + total) % total;

        atualizarCarrossel(-1);
    }

    function criarCard(noticia) {
        const card = document.createElement("article");

        card.classList.add("card");

        const imagem = obterImagem(noticia);

        const imagemHtml = imagem
            ? `
                <img
                    src="${escaparHtml(imagem)}"
                    alt="${escaparHtml(noticia.titulo)}"
                    loading="lazy"
                >
            `
            : `
                <div class="card-imagem-vazia">
                    <i class="fa-regular fa-image"></i>
                </div>
            `;

        const botoesGerenciamento = podeGerenciar(noticia)
            ? `
                <a class="editar"
                   href="/html/criar.html?id=${encodeURIComponent(noticia.id)}">
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

                <p>
                    ${escaparHtml(limitarTexto(obterResumo(noticia)))}
                </p>

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

        card.querySelector(".visualizar")?.addEventListener(
            "click",
            () => abrirModal(noticia)
        );

        card.querySelector(".excluir")?.addEventListener(
            "click",
            () => excluirNoticia(noticia)
        );

        return card;
    }

    function carregarNoticias() {
        if (!cardsContainer) return;

        cardsContainer.replaceChildren();

        const termo = (pesquisa?.value || "")
            .toLocaleLowerCase("pt-BR")
            .trim();

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

        const confirmar = confirm(
            "Deseja realmente excluir esta notícia?"
        );

        if (!confirmar) return;

        try {
            await requisicao(
                `/noticias/excluir/${noticia.id}`,
                {
                    method: "DELETE"
                }
            );

            noticias = noticias.filter(
                item => Number(item.id) !== Number(noticia.id)
            );

            if (indiceAtual >= noticias.length) {
                indiceAtual = 0;
            }

            carregarNoticias();
            atualizarCarrossel();
        } catch (erro) {
            console.error("Erro ao excluir notícia:", erro);
            alert(erro.message);
        }
    }

    async function buscarNoticias() {
        if (!cardsContainer) return;

        cardsContainer.innerHTML = `
            <div class="estado-noticias">
                Carregando notícias...
            </div>
        `;

        try {
            if (!usuarioAtual) {
                throw new Error(
                    "Faça login para visualizar as notícias."
                );
            }

            const dados = await requisicao("/noticias/listar");

            if (Array.isArray(dados)) {
                noticias = dados;
            } else if (Array.isArray(dados.noticias)) {
                noticias = dados.noticias;
            } else {
                throw new Error(
                    "Formato de resposta inesperado ao listar notícias."
                );
            }

            noticias.sort((a, b) =>
                new Date(b.dataPublicacao) -
                new Date(a.dataPublicacao)
            );

            indiceAtual = 0;

            carregarNoticias();
            atualizarCarrossel();
        } catch (erro) {
            console.error("Erro ao buscar notícias:", erro);

            cardsContainer.replaceChildren();

            const mensagem = document.createElement("div");

            mensagem.className = "estado-noticias";
            mensagem.textContent = erro.message;

            cardsContainer.appendChild(mensagem);

            if (tituloBanner) {
                tituloBanner.textContent = "Notícias indisponíveis";
            }

            if (descricaoBanner) {
                descricaoBanner.textContent =
                    "Não foi possível carregar as notícias.";
            }

            if (botaoLerMais) {
                botaoLerMais.disabled = true;
            }
        }
    }

    fechar?.addEventListener("click", fecharModal);

    modal?.addEventListener("click", evento => {
        if (evento.target === modal) {
            fecharModal();
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            fecharModal();
        }
    });

    botaoProximo?.addEventListener(
        "click",
        proximaNoticia
    );

    botaoAnterior?.addEventListener(
        "click",
        noticiaAnterior
    );

    botaoLerMais?.addEventListener("click", () => {
        const noticia = noticiasDoBanner()[indiceAtual];

        if (noticia) {
            abrirModal(noticia);
        }
    });

    pesquisa?.addEventListener(
        "input",
        carregarNoticias
    );

    intervaloCarrossel = setInterval(
        proximaNoticia,
        6000
    );

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            clearInterval(intervaloCarrossel);
            intervaloCarrossel = null;
        } else if (!intervaloCarrossel) {
            intervaloCarrossel = setInterval(
                proximaNoticia,
                6000
            );
        }
    });

    buscarNoticias();
})();
