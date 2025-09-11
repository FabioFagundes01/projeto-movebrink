// Declara a variável AOS para que o TypeScript a reconheça, pois ela é carregada de um script externo
declare const AOS: any;

// Inicia a biblioteca de animações com algumas configurações padrão
AOS.init({
    duration: 800, // Duração das animações em milissegundos
    once: true    // Define se a animação acontece apenas uma vez ao rolar
});


// --- CÓDIGO DO MENU HAMBÚRGUER (Funciona em todas as páginas) ---
const mobileMenuIcon = document.querySelector('.mobile-menu-icon') as HTMLElement;
const mainNav = document.querySelector('.main-nav') as HTMLElement;

const navToggle = () => {
    // Adiciona/remove a classe que mostra/esconde o menu
    mainNav.classList.toggle('nav-active');
    // Adiciona/remove a classe que anima o ícone para um "X"
    mobileMenuIcon.classList.toggle('toggle');
};

// Garante que o código só é executado se o ícone do menu existir
if (mobileMenuIcon) {
    mobileMenuIcon.addEventListener('click', navToggle);
}


// --- CÓDIGO DE VALIDAÇÃO DO FORMULÁRIO DE CONTATO (Só funciona na página de contato) ---
const form = document.getElementById('contact-form') as HTMLFormElement;

// Este bloco de código só corre se o elemento com id="contact-form" existir na página atual
if (form) {
    // Seleciona todos os campos do formulário
    const companyInput = document.getElementById('company') as HTMLInputElement;
    const segmentInput = document.getElementById('segment') as HTMLSelectElement;
    const nameInput = document.getElementById('name') as HTMLInputElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const messageInput = document.getElementById('message') as HTMLTextAreaElement;

    // Função para mostrar uma mensagem de erro num campo
    const setError = (element: HTMLElement, message: string) => {
        const formGroup = element.parentElement as HTMLElement;
        const small = formGroup.querySelector('small') as HTMLElement;
        small.innerText = message;
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
    };

    // Função para indicar que um campo foi preenchido corretamente
    const setSuccess = (element: HTMLElement) => {
        const formGroup = element.parentElement as HTMLElement;
        const small = formGroup.querySelector('small') as HTMLElement;
        small.innerText = '';
        formGroup.classList.add('success');
        formGroup.classList.remove('error');
    };

    // Função para verificar se um texto é um formato de e-mail válido
    const isValidEmail = (email: string): boolean => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    // Função principal que valida todos os campos do formulário
    const validateInputs = (): boolean => {
        const segmentValue = segmentInput.value;
        const nameValue = nameInput.value.trim();
        const emailValue = emailInput.value.trim();
        const messageValue = messageInput.value.trim();
        let isValid = true;

        // Validação para o campo Segmento (obrigatório)
        if (segmentValue === '') {
            setError(segmentInput, 'Por favor, escolha um segmento');
            isValid = false;
        } else {
            setSuccess(segmentInput);
        }

        // Validação para o campo Nome (obrigatório)
        if (nameValue === '') { setError(nameInput, 'O nome é obrigatório'); isValid = false; } else { setSuccess(nameInput); }
        
        // Validação para o campo Email (obrigatório e formato válido)
        if (emailValue === '') { setError(emailInput, 'O email é obrigatório'); isValid = false; } else if (!isValidEmail(emailValue)) { setError(emailInput, 'Forneça um email válido'); isValid = false; } else { setSuccess(emailInput); }
        
        // Validação para o campo Mensagem (obrigatório)
        if (messageValue === '') { setError(messageInput, 'A mensagem é obrigatória'); isValid = false; } else { setSuccess(messageInput); }
        
        // O campo Empresa é opcional, então não é validado.
        
        return isValid;
    };

    // Adiciona o "ouvinte" para o evento de submissão do formulário
    form.addEventListener('submit', (e: Event) => {
        e.preventDefault(); // Impede que a página recarregue ao enviar

        // Se a validação passar, mostra um alerta e limpa o formulário
        if (validateInputs()) {
            alert('Mensagem enviada com sucesso!');
            form.reset();
            // Limpa as classes de 'sucesso' dos campos
            document.querySelectorAll('.form-group').forEach(group => {
                group.classList.remove('success');
            });
        }
    });
}