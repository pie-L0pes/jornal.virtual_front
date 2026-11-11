
document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".header-global");

    if (!header) return;

    let ultimaPosicao = Math.max(window.scrollY, 0);
    const limite = 100;
    const tolerancia = 5;

    function atualizarHeader() {
        const posicaoAtual = Math.max(window.scrollY, 0);
        const diferenca = posicaoAtual - ultimaPosicao;

        const menuAberto = header.querySelector(
            ".nav-principal.aberto"
        );

        if (posicaoAtual <= limite || menuAberto) {
            header.classList.remove("header-oculto");
        } else if (diferenca > tolerancia) {
            header.classList.add("header-oculto");
        } else if (diferenca < -tolerancia) {
            header.classList.remove("header-oculto");
        }

        ultimaPosicao = posicaoAtual;
    }

    window.addEventListener("scroll", atualizarHeader, {
        passive: true
    });

    header.addEventListener("focusin", () => {
        header.classList.remove("header-oculto");
    });

    header.addEventListener("click", () => {
        if (header.querySelector(".nav-principal.aberto")) {
            header.classList.remove("header-oculto");
        }
    });

    atualizarHeader();
});
