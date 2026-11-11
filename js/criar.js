const form = document.getElementById("formNoticia");
const titulo = document.getElementById("titulo");
const categoria = document.getElementById("categoria");
const autor = document.getElementById("autor");
const imagem = document.getElementById("imagem");
const resumo = document.getElementById("resumo");
const conteudo = document.getElementById("conteudo");
const contadorTitulo = document.getElementById("contadorTitulo");
const contadorResumo = document.getElementById("contadorResumo");
const previewTitulo = document.getElementById("previewTitulo");
const previewCategoria = document.getElementById("previewCategoria");
const previewAutor = document.getElementById("previewAutor");
const previewResumo = document.getElementById("previewResumo");
const previewFoto = document.getElementById("previewFoto");
const previewImagem = document.getElementById("previewImagem");
const mensagem = document.getElementById("mensagem");

const token = localStorage.getItem("token") || sessionStorage.getItem("token");
const apiUrl = (typeof API_URL !== "undefined" ? API_URL : "http://localhost:3000").replace(/\/$/, "");
const noticiaId = new URLSearchParams(window.location.search).get("id");

let usuario = null;
let noticiaOriginal = null;
let urlImagemTemporaria = null;
let salvando = false;

function obterUsuarioToken() {
    if (!token) return null;

    try {
        const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const base64 = parte.padEnd(Math.ceil(parte.length / 4) * 4, "=");
        const texto = decodeURIComponent(
            Array.from(atob(base64), caractere =>
                `%${caractere.charCodeAt(0).toString(16).padStart(2, "0")}`
            ).join("")
        );

        return JSON.parse(texto);
    } catch {
        return null;
    }
}

usuario = obterUsuarioToken();

const administrador = usuario?.tipo === "ADMINISTRADOR";
const verificado = usuario?.tipo === "VERIFICADO";
const podePublicar = administrador || verificado;

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
            "Não foi possível concluir a operação."
        );
    }

    return dados;
}

function mostrarMensagem(texto, erro = false) {
    if (!mensagem) {
        if (erro) alert(texto);
        return;
    }

    mensagem.textContent = texto;
    mensagem.style.color = erro ? "var(--danger)" : "var(--primary)";
    mensagem.style.display = "block";
}

function atualizarPrevia() {
    if (contadorTitulo) contadorTitulo.textContent = titulo.value.length;
    if (contadorResumo) contadorResumo.textContent = resumo.value.length;

    if (previewTitulo) {
        previewTitulo.textContent = titulo.value.trim() || "Título da notícia";
    }

    if (previewResumo) {
        previewResumo.textContent = resumo.value.trim() || "Resumo da notícia";
    }

    if (previewCategoria) {
        previewCategoria.textContent = categoria?.value || "NOTÍCIA";
    }

    if (previewAutor) {
        previewAutor.textContent = usuario?.nome || "Autor";
    }
}

function mostrarImagem(url) {
    if (!url) return;

    if (previewFoto) {
        if (previewFoto.tagName === "IMG") {
            previewFoto.src = url;
        } else {
            const foto = document.createElement("img");
            foto.src = url;
            foto.alt = "Prévia da notícia";
            foto.style.width = "100%";
            foto.style.height = "100%";
            foto.style.objectFit = "cover";
            previewFoto.replaceChildren(foto);
        }
    }

    if (previewImagem) {
        if (previewImagem.tagName === "IMG") {
            previewImagem.src = url;
        } else {
            const miniatura = document.createElement("img");
            miniatura.src = url;
            miniatura.alt = "Imagem selecionada";
            miniatura.style.maxWidth = "100%";
            miniatura.style.maxHeight = "150px";
            miniatura.style.objectFit = "contain";
            previewImagem.replaceChildren(miniatura);
        }
    }
}

function obterImagemNoticia(noticia) {
    const midia = noticia.midias?.find(item =>
        item.mimeType?.startsWith("image/")
    );

    if (!midia?.path) return null;

    const caminho = midia.path.replace(/\\/g, "/");

    if (/^https?:\/\//i.test(caminho)) return caminho;

    return `${apiUrl}/${caminho.replace(/^\/+/, "")}`;
}

function podeEditar(noticia) {
    return administrador || (
        verificado &&
        Number(noticia.usuarioId) === Number(usuario?.id)
    );
}

async function carregarNoticia() {
    if (!noticiaId) return;

    try {
        const dados = await requisicao(`/noticias/buscar/${noticiaId}`);
        const noticia = dados.noticia || dados;

        if (!podeEditar(noticia)) {
            throw new Error("Você não tem permissão para editar esta notícia.");
        }

        noticiaOriginal = noticia;

        titulo.value = noticia.titulo || "";
        resumo.value = noticia.subtitulo || "";
        conteudo.value = noticia.texto || "";

        if (autor) {
            autor.value = noticia.autor?.nome || usuario?.nome || "";
        }

        const imagemExistente = obterImagemNoticia(noticia);

        if (imagemExistente) {
            mostrarImagem(imagemExistente);
        }

        atualizarPrevia();

        const botao = form.querySelector('[type="submit"]');

        if (botao) {
            botao.textContent = "Salvar alterações";
        }

        document.title = "Editar notícia | Jornal Online";
    } catch (erro) {
        mostrarMensagem(erro.message, true);
        form.querySelectorAll("input, textarea, select, button").forEach(campo => {
            campo.disabled = true;
        });
    }
}

async function enviarImagem(id, arquivo) {
    const dadosImagem = new FormData();
    dadosImagem.append("arquivo", arquivo);

    return requisicao(`/midias-noticias/cadastrar/${id}`, {
        method: "POST",
        body: dadosImagem
    });
}

async function salvarNoticia(evento) {
    evento.preventDefault();

    if (salvando || !podePublicar) return;

    const tituloValor = titulo.value.trim();
    const resumoValor = resumo.value.trim();
    const conteudoValor = conteudo.value.trim();

    if (!tituloValor || !conteudoValor) {
        mostrarMensagem("Preencha o título e o conteúdo da notícia.", true);
        return;
    }

    const arquivo = imagem?.files?.[0];

    if (arquivo && !arquivo.type.startsWith("image/")) {
        mostrarMensagem("Selecione um arquivo de imagem válido.", true);
        return;
    }

    const botao = form.querySelector('[type="submit"]');
    const textoOriginal = botao?.textContent;

    salvando = true;

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Salvando...";
    }

    try {
        const dados = await requisicao(
            noticiaId
                ? `/noticias/atualizar/${noticiaId}`
                : "/noticias/cadastrar",
            {
                method: noticiaId ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    titulo: tituloValor,
                    subtitulo: resumoValor,
                    texto: conteudoValor
                })
            }
        );

        const id = noticiaId || dados.noticia?.id || dados.id;

        if (arquivo) {
            if (!id) {
                throw new Error("Notícia salva, mas o servidor não retornou o ID necessário para enviar a imagem.");
            }

            try {
                await enviarImagem(id, arquivo);
            } catch (erro) {
                throw new Error(
                    `A notícia foi salva, mas houve um erro ao enviar a imagem: ${erro.message}`
                );
            }
        }

        mostrarMensagem(
            noticiaId
                ? "Notícia atualizada com sucesso!"
                : "Notícia publicada com sucesso!"
        );

        window.location.href = "/html/inicio.html";
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    } finally {
        salvando = false;

        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    }
}

if (titulo) titulo.addEventListener("input", atualizarPrevia);
if (resumo) resumo.addEventListener("input", atualizarPrevia);
if (categoria) categoria.addEventListener("change", atualizarPrevia);

if (autor) {
    autor.value = usuario?.nome || "";
    autor.readOnly = true;
}

if (imagem) {
    imagem.addEventListener("change", () => {
        const arquivo = imagem.files?.[0];

        if (urlImagemTemporaria) {
            URL.revokeObjectURL(urlImagemTemporaria);
            urlImagemTemporaria = null;
        }

        if (!arquivo) return;

        if (!arquivo.type.startsWith("image/")) {
            imagem.value = "";
            mostrarMensagem("Selecione uma imagem válida.", true);
            return;
        }

        urlImagemTemporaria = URL.createObjectURL(arquivo);
        mostrarImagem(urlImagemTemporaria);
    });
}

if (!podePublicar) {
    mostrarMensagem("Sua conta não tem permissão para publicar notícias.", true);
    form.querySelectorAll("input, textarea, select, button").forEach(campo => {
        campo.disabled = true;
    });
} else {
    form.addEventListener("submit", salvarNoticia);
    carregarNoticia();
}

atualizarPrevia();
