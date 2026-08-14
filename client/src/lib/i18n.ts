export type Language = "pt" | "en" | "es";

export const languages: { code: Language; label: string; flag: string }[] = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export const translations = {
  pt: {
    // Page header
    pageTitle: "Pré-Cadastro",
    pageHeading: "Cadastre-se para alugar",
    pageSubheading:
      "Preencha o formulário abaixo para agilizar seu atendimento. Após o envio, nossa equipe entrará em contato pelo WhatsApp para confirmar sua reserva.",

    // Section titles
    sectionIdentification: "Identificação",
    sectionContact: "Contato",
    sectionAddress: "Endereço de Residência",
    sectionDocumentPhotos: "Documento",
    sectionBikeSelection: "Seleção da Bicicleta",
    sectionRentalPeriod: "Período do Aluguel",
    sectionAccessories: "Acessórios",
    sectionPayment: "Forma de Pagamento",
    sectionPrivacy: "Privacidade e Consentimento (LGPD)",

    // Identification fields
    fullName: "Nome Completo",
    fullNamePlaceholder: "Seu nome completo",
    cpf: "CPF",
    cpfPlaceholder: "000.000.000-00",
    cpfInvalid: "CPF inválido",
    rg: "RG / Passaporte",
    rgPlaceholder: "Ex: 12.345.678-9",
    rgHint: "Somente números e traços. Passaporte: informe o número completo.",
    docOrigin: "Origem do Documento",
    docOriginBrazil: "Brasil (+55)",
    docOriginForeign: "Estrangeiro",
    birthDate: "Data de Nascimento",
    birthDatePlaceholder: "dd/mm/aaaa",
    gender: "Gênero",
    genderMale: "Masculino",
    genderFemale: "Feminino",
    genderOther: "Outro",
    genderPreferNotToSay: "Prefiro não informar",
    height: "Altura",
    heightPlaceholder: "Ex: 1.75",
    heightHint: "Usamos para indicar a bike ideal para você.",
    pedalFrequency: "Frequência de Pedalada",
    pedalFreq1: "1x por semana",
    pedalFreq2: "2-3x por semana",
    pedalFreq3: "4-5x por semana",
    pedalFreqDaily: "Diariamente",
    pedalFreqRarely: "Raramente",
    howFoundUs: "Como Nos Encontrou?",
    howFoundInternet: "Pela internet",
    howFoundInstagram: "Instagram",
    howFoundFriend: "Indicação de amigo",
    howFoundShopify: "Site / Shopify",
    howFoundOther: "Outro",

    // Contact fields
    whatsapp: "Telefone/WhatsApp",
    whatsappPlaceholder: "(48) 99999-9999",
    email: "E-Mail",
    emailPlaceholder: "seu@email.com",
    instagram: "Instagram",
    instagramPlaceholder: "@seu.perfil",
    accommodation: "Onde Está Hospedado?",
    accommodationPlaceholder: "Hotel, pousada, airbnb...",
    accommodationHint: "Bairro ou nome do local em Floripa.",

    // Address fields
    zipCode: "CEP",
    zipCodePlaceholder: "00000-000",
    zipCodeSearching: "Buscando...",
    state: "Estado",
    statePlaceholder: "Selecione",
    city: "Cidade",
    cityPlaceholder: "Sua cidade",
    street: "Endereço",
    streetPlaceholder: "Rua, Avenida...",
    number: "Número",
    numberPlaceholder: "Nº",
    complement: "Complemento",
    complementPlaceholder: "Apto, bloco...",
    neighborhood: "Bairro",
    neighborhoodPlaceholder: "Seu bairro",

    // Document photos
    docPhotosDescription:
      "Envie a frente e o verso do seu RG ou Passaporte. Ambas as fotos são obrigatórias para prosseguir.",
    docFront: "Frente do documento",
    docBack: "Verso do documento",
    docUploadHint: "Clique ou arraste aqui",
    docUploadFormats: "JPG, PNG ou HEIC · Máx. 10 MB",
    docUploading: "Enviando...",
    docUploadSuccess: "Enviado com sucesso",
    docUploadError: "Erro ao enviar. Tente novamente.",

    // Bike selection
    loadingBikes: "Carregando bicicletas...",
    noBikesAvailable: "Nenhuma bicicleta disponível no momento.",
    perDay: "/dia",
    selectBike: "Selecionar",
    selected: "Selecionada",
    available: "Disponível",
    unavailable: "Indisponível",
    checkAvailability: "Verificar disponibilidade",
    bikeAvailable: "Disponível para o período selecionado",
    bikeUnavailable: "Indisponível para o período selecionado",

    // Rental period
    startDate: "Data de Início",
    endDate: "Data de Devolução",
    deliveryTime: "Horário de Entrega",
    selectTime: "Selecione o horário",
    days: "dias",
    day: "dia",

    // Accessories
    noAccessories: "Nenhum acessório disponível.",
    accessoryUnit: "un.",

    // Payment
    paymentCard: "Cartão de Crédito",
    paymentPix: "Pix",
    paymentCash: "Pagar na Entrega",
    paymentCashDesc: "Pague presencialmente na entrega",

    // Price summary
    summaryTitle: "Resumo",
    summaryBike: "Bicicleta",
    summaryDelivery: "Taxa de entrega",
    summaryAccessories: "Acessórios",
    summaryDiscount: "Desconto",
    summaryTotal: "Total",
    summaryFree: "Grátis",

    // LGPD
    lgpdTitle: "Termos de uso e privacidade",
    lgpdText:
      "Ao enviar este formulário, seus dados pessoais serão coletados pela Bike To Go Floripa exclusivamente para fins de cadastro, controle de aluguel de bicicletas e comunicação via WhatsApp. Suas informações serão tratadas de forma segura e confidencial, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018). Você pode solicitar a exclusão ou correção dos seus dados a qualquer momento entrando em contato pelo e-mail ou WhatsApp da loja.",
    lgpdConsent:
      "Li e concordo com os termos acima e autorizo o uso dos meus dados pessoais conforme a LGPD.",

    // ─── Política completa, aberta na própria tela (2026-08-11) ───────────────
    // Cada bloco existe para atender um inciso do art. 9º da LGPD, que exige
    // informação "clara, adequada e ostensiva" sobre: finalidade específica (I),
    // forma e DURAÇÃO do tratamento (II), identificação (III) e contato (IV) do
    // controlador, USO COMPARTILHADO e sua finalidade (V), e direitos do
    // titular (VII). A transferência internacional atende o art. 33.
    lgpdVerPolitica: "Ler a política de privacidade completa",
    lgpdFecharPolitica: "Fechar",
    lgpdPolitica: [
      {
        titulo: "Quem trata os seus dados",
        corpo:
          "O controlador dos seus dados é a Bike To Go Floripa (C M Baptistotti Esportes LTDA, CNPJ 43.247.917/0001-06), com sede em Florianópolis/SC. Contato: biketogo.floripa@gmail.com ou WhatsApp (48) 98863-1669.",
      },
      {
        titulo: "Quais dados coletamos",
        corpo:
          "Nome completo, data de nascimento, CPF, RG ou passaporte, altura e peso, telefone, e-mail, Instagram, endereço, local de hospedagem e frequência com que você pedala. Também coletamos a IMAGEM do seu documento de identificação com foto, que você envia neste formulário.",
      },
      {
        titulo: "Para que usamos",
        corpo:
          "Para identificar você no contrato de locação, reservar a bicicleta e os acessórios, combinar entrega e devolução, emitir o contrato e o recibo, e falar com você pelo WhatsApp ou e-mail sobre a sua reserva. A base legal é a execução do contrato de locação (art. 7º, V, da LGPD). Marketing só é enviado se você marcar o aceite específico, e pode ser cancelado quando quiser.",
      },
      {
        titulo: "Com quem compartilhamos",
        corpo:
          "Não vendemos os seus dados. Eles ficam armazenados e são processados por empresas que operam a nossa infraestrutura: Supabase (banco de dados e armazenamento dos arquivos), Railway (hospedagem do sistema), Resend (envio dos e-mails de reserva e recibo) e ViaCEP (consulta de endereço a partir do CEP). Essas empresas atuam como operadoras e só podem usar os dados para prestar esse serviço.",
      },
      {
        titulo: "Onde os seus dados ficam",
        corpo:
          "O banco de dados e os arquivos que você envia ficam armazenados em servidores no Brasil. A exceção é o serviço de e-mail: os registros de envio das mensagens de reserva e recibo ficam armazenados nos Estados Unidos, o que caracteriza transferência internacional de dados (art. 33 da LGPD). Essa transferência acontece apenas para comunicar você sobre a sua reserva e está sujeita às garantias contratuais exigidas pela legislação brasileira.",
      },
      {
        titulo: "O link do seu contrato",
        corpo:
          "Quando a reserva é registrada, enviamos por e-mail um link exclusivo em que você acompanha o seu contrato sem precisar de senha. Quem tiver esse link consegue ver os dados do contrato, então não o compartilhe com terceiros.",
      },
      {
        titulo: "Por quanto tempo guardamos",
        corpo:
          "Mantemos os seus dados enquanto durar a relação de locação e pelo prazo necessário para cumprir obrigações legais e fiscais. Cadastros arquivados e não convertidos em locação são eliminados automaticamente após o prazo definido no sistema. Você pode pedir a exclusão antes disso, ressalvado o que a lei obriga a manter.",
      },
      {
        titulo: "Seus direitos",
        corpo:
          "Você pode, a qualquer momento e sem custo, confirmar se tratamos os seus dados, acessá-los, corrigir dados incompletos ou desatualizados, pedir anonimização ou eliminação, solicitar a portabilidade, saber com quem compartilhamos e revogar o consentimento (art. 18 da LGPD). Para exercer qualquer um deles, escreva para biketogo.floripa@gmail.com. Você também pode reclamar à ANPD.",
      },
    ] as Array<{ titulo: string; corpo: string }>,

    // Submit
    submitButton: "Enviar pelo WhatsApp",
    submitButtonCash: "Confirmar reserva",
    submitting: "Enviando...",
    submitHint:
      "Ao clicar, você será redirecionado para o WhatsApp com todos os dados preenchidos.",

    // Success / Error
    successTitle: "Reserva enviada com sucesso!",
    successMessage:
      "Recebemos seu pré-cadastro. Nossa equipe entrará em contato pelo WhatsApp em breve para confirmar os detalhes.",
    errorTitle: "Erro ao enviar",
    errorMessage:
      "Ocorreu um erro ao enviar seu formulário. Por favor, tente novamente.",
    duplicateMessage:
      "Já existe um cadastro com estes dados. Chame a loja no WhatsApp para continuar a sua reserva.",

    // Validation
    required: "Campo obrigatório",
    invalidEmail: "E-mail inválido",
    invalidPhone: "Telefone inválido",
    invalidCpf: "CPF inválido",
    invalidDate: "Data inválida",
    mustAcceptLgpd: "Você deve aceitar os termos para continuar",
    mustSelectBike: "Selecione uma bicicleta",
    mustSelectDates: "Selecione as datas do aluguel",
    mustSelectTime: "Selecione o horário de entrega",
    mustSelectPayment: "Selecione a forma de pagamento",
    mustUploadDocs: "Envie as fotos do documento",
    // Cart (multi-bike)
    addToCart: "Adicionar ao carrinho",
    removeFromCart: "Remover",
    cartTitle: "Carrinho de Bikes",
    cartEmpty: "Nenhuma bike no carrinho. Selecione uma bike, tamanho e datas acima.",
    cartItemSummary: "bike(s) no carrinho",
    cartTotal: "Total do Carrinho",
    mustAddToCart: "Adicione pelo menos uma bike ao carrinho",
  },

  en: {
    pageTitle: "Pre-Registration",
    pageHeading: "Register to rent",
    pageSubheading:
      "Fill in the form below to speed up your service. After submission, our team will contact you via WhatsApp to confirm your reservation.",

    sectionIdentification: "Identification",
    sectionContact: "Contact",
    sectionAddress: "Home Address",
    sectionDocumentPhotos: "Document",
    sectionBikeSelection: "Bike Selection",
    sectionRentalPeriod: "Rental Period",
    sectionAccessories: "Accessories",
    sectionPayment: "Payment Method",
    sectionPrivacy: "Privacy and Consent (LGPD)",

    fullName: "Full Name",
    fullNamePlaceholder: "Your full name",
    cpf: "CPF (Brazilian ID)",
    cpfPlaceholder: "000.000.000-00",
    cpfInvalid: "Invalid CPF",
    rg: "RG / Passport",
    rgPlaceholder: "Ex: 12.345.678-9",
    rgHint: "Numbers and dashes only. Passport: enter the full number.",
    docOrigin: "Document Origin",
    docOriginBrazil: "Brazil (+55)",
    docOriginForeign: "Foreign",
    birthDate: "Date of Birth",
    birthDatePlaceholder: "dd/mm/yyyy",
    gender: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    genderPreferNotToSay: "Prefer not to say",
    height: "Height",
    heightPlaceholder: "Ex: 1.75",
    heightHint: "We use this to recommend the ideal bike for you.",
    pedalFrequency: "Cycling Frequency",
    pedalFreq1: "Once a week",
    pedalFreq2: "2-3 times a week",
    pedalFreq3: "4-5 times a week",
    pedalFreqDaily: "Daily",
    pedalFreqRarely: "Rarely",
    howFoundUs: "How Did You Find Us?",
    howFoundInternet: "Online search",
    howFoundInstagram: "Instagram",
    howFoundFriend: "Friend referral",
    howFoundShopify: "Website / Shopify",
    howFoundOther: "Other",

    whatsapp: "Phone/WhatsApp",
    whatsappPlaceholder: "(48) 99999-9999",
    email: "E-Mail",
    emailPlaceholder: "your@email.com",
    instagram: "Instagram",
    instagramPlaceholder: "@your.profile",
    accommodation: "Where Are You Staying?",
    accommodationPlaceholder: "Hotel, hostel, airbnb...",
    accommodationHint: "Neighborhood or place name in Floripa.",

    zipCode: "ZIP Code",
    zipCodePlaceholder: "00000-000",
    zipCodeSearching: "Searching...",
    state: "State",
    statePlaceholder: "Select",
    city: "City",
    cityPlaceholder: "Your city",
    street: "Street Address",
    streetPlaceholder: "Street, Avenue...",
    number: "Number",
    numberPlaceholder: "No.",
    complement: "Complement",
    complementPlaceholder: "Apt, block...",
    neighborhood: "Neighborhood",
    neighborhoodPlaceholder: "Your neighborhood",

    docPhotosDescription:
      "Upload the front and back of your ID or Passport. Both photos are required to proceed.",
    docFront: "Front of document",
    docBack: "Back of document",
    docUploadHint: "Click or drag here",
    docUploadFormats: "JPG, PNG or HEIC · Max. 10 MB",
    docUploading: "Uploading...",
    docUploadSuccess: "Uploaded successfully",
    docUploadError: "Upload failed. Please try again.",

    loadingBikes: "Loading bikes...",
    noBikesAvailable: "No bikes available at the moment.",
    perDay: "/day",
    selectBike: "Select",
    selected: "Selected",
    available: "Available",
    unavailable: "Unavailable",
    checkAvailability: "Check availability",
    bikeAvailable: "Available for the selected period",
    bikeUnavailable: "Unavailable for the selected period",

    startDate: "Start Date",
    endDate: "Return Date",
    deliveryTime: "Delivery Time",
    selectTime: "Select time",
    days: "days",
    day: "day",

    noAccessories: "No accessories available.",
    accessoryUnit: "un.",

    paymentCard: "Credit Card",
    paymentPix: "Pix",
    paymentCash: "Pay on Delivery",
    paymentCashDesc: "Pay in person upon delivery",

    summaryTitle: "Summary",
    summaryBike: "Bike",
    summaryDelivery: "Delivery fee",
    summaryAccessories: "Accessories",
    summaryDiscount: "Discount",
    summaryTotal: "Total",
    summaryFree: "Free",

    lgpdTitle: "Terms of use and privacy",
    lgpdText:
      "By submitting this form, your personal data will be collected by Bike To Go Floripa exclusively for registration, bike rental management, and WhatsApp communication purposes. Your information will be handled securely and confidentially, in accordance with the Brazilian General Data Protection Law (LGPD, Law No. 13,709/2018). You may request deletion or correction of your data at any time by contacting us via email or WhatsApp.",
    lgpdConsent:
      "I have read and agree to the terms above and authorize the use of my personal data in accordance with LGPD.",

    lgpdVerPolitica: "Read the full privacy policy",
    lgpdFecharPolitica: "Close",
    lgpdPolitica: [
      {
        titulo: "Who processes your data",
        corpo:
          "The data controller is Bike To Go Floripa (C M Baptistotti Esportes LTDA, company ID 43.247.917/0001-06), based in Florianópolis, Brazil. Contact: biketogo.floripa@gmail.com or WhatsApp +55 (48) 98863-1669.",
      },
      {
        titulo: "What we collect",
        corpo:
          "Full name, date of birth, national ID or passport number, height and weight, phone, e-mail, Instagram, address, where you are staying, and how often you ride. We also collect the IMAGE of your photo ID, which you upload in this form.",
      },
      {
        titulo: "Why we use it",
        corpo:
          "To identify you in the rental agreement, reserve the bike and accessories, arrange delivery and return, issue the contract and the receipt, and contact you by WhatsApp or e-mail about your booking. The legal basis is performance of the rental contract (art. 7, V of the Brazilian LGPD). Marketing is only sent if you tick the specific box, and can be cancelled at any time.",
      },
      {
        titulo: "Who we share it with",
        corpo:
          "We do not sell your data. It is stored and processed by the companies running our infrastructure: Supabase (database and file storage), Railway (system hosting), Resend (booking and receipt e-mails) and ViaCEP (address lookup from postcode). They act as processors and may only use the data to provide that service.",
      },
      {
        titulo: "Where your data is stored",
        corpo:
          "The database and the files you upload are stored on servers in Brazil. The exception is our e-mail service: the delivery records of the booking and receipt messages are stored in the United States, which constitutes an international data transfer (art. 33 of the LGPD). It happens solely to contact you about your booking and is subject to the contractual safeguards required by Brazilian law.",
      },
      {
        titulo: "Your contract link",
        corpo:
          "When your booking is registered we e-mail you a unique link where you can follow your contract without a password. Anyone holding that link can see the contract details, so please do not share it.",
      },
      {
        titulo: "How long we keep it",
        corpo:
          "We keep your data for as long as the rental relationship lasts and for the period required by legal and tax obligations. Archived records that never became a rental are deleted automatically after the period set in the system. You may request deletion earlier, except for what the law requires us to keep.",
      },
      {
        titulo: "Your rights",
        corpo:
          "At any time and free of charge you may confirm whether we process your data, access it, correct incomplete or outdated information, request anonymisation or deletion, request portability, find out who we share it with, and withdraw consent (art. 18 of the LGPD). To exercise any of these, write to biketogo.floripa@gmail.com. You may also file a complaint with the Brazilian data protection authority (ANPD).",
      },
    ] as Array<{ titulo: string; corpo: string }>,

    submitButton: "Send via WhatsApp",
    submitButtonCash: "Confirm reservation",
    submitting: "Submitting...",
    submitHint:
      "By clicking, you will be redirected to WhatsApp with all your details.",

    successTitle: "Reservation submitted successfully!",
    successMessage:
      "We received your pre-registration. Our team will contact you via WhatsApp shortly to confirm the details.",
    errorTitle: "Submission error",
    errorMessage:
      "An error occurred while submitting your form. Please try again.",
    duplicateMessage:
      "There is already a registration with this data. Message the store on WhatsApp to continue your booking.",

    required: "Required field",
    invalidEmail: "Invalid email",
    invalidPhone: "Invalid phone number",
    invalidCpf: "Invalid CPF",
    invalidDate: "Invalid date",
    mustAcceptLgpd: "You must accept the terms to continue",
    mustSelectBike: "Please select a bike",
    mustSelectDates: "Please select rental dates",
    mustSelectTime: "Please select a delivery time",
    mustSelectPayment: "Please select a payment method",
    mustUploadDocs: "Please upload document photos",
    // Cart (multi-bike)
    addToCart: "Add to cart",
    removeFromCart: "Remove",
    cartTitle: "Bike Cart",
    cartEmpty: "No bikes in cart. Select a bike, size and dates above.",
    cartItemSummary: "bike(s) in cart",
    cartTotal: "Cart Total",
    mustAddToCart: "Add at least one bike to the cart",
  },

  es: {
    pageTitle: "Pre-Registro",
    pageHeading: "Regístrate para alquilar",
    pageSubheading:
      "Completa el formulario a continuación para agilizar tu atención. Tras el envío, nuestro equipo se pondrá en contacto por WhatsApp para confirmar tu reserva.",

    sectionIdentification: "Identificación",
    sectionContact: "Contacto",
    sectionAddress: "Dirección de Residencia",
    sectionDocumentPhotos: "Documento",
    sectionBikeSelection: "Selección de Bicicleta",
    sectionRentalPeriod: "Período de Alquiler",
    sectionAccessories: "Accesorios",
    sectionPayment: "Forma de Pago",
    sectionPrivacy: "Privacidad y Consentimiento (LGPD)",

    fullName: "Nombre Completo",
    fullNamePlaceholder: "Tu nombre completo",
    cpf: "CPF (ID Brasileño)",
    cpfPlaceholder: "000.000.000-00",
    cpfInvalid: "CPF inválido",
    rg: "RG / Pasaporte",
    rgPlaceholder: "Ej: 12.345.678-9",
    rgHint: "Solo números y guiones. Pasaporte: ingresa el número completo.",
    docOrigin: "Origen del Documento",
    docOriginBrazil: "Brasil (+55)",
    docOriginForeign: "Extranjero",
    birthDate: "Fecha de Nacimiento",
    birthDatePlaceholder: "dd/mm/aaaa",
    gender: "Género",
    genderMale: "Masculino",
    genderFemale: "Femenino",
    genderOther: "Otro",
    genderPreferNotToSay: "Prefiero no decir",
    height: "Altura",
    heightPlaceholder: "Ej: 1.75",
    heightHint: "Lo usamos para recomendarte la bici ideal.",
    pedalFrequency: "Frecuencia de Ciclismo",
    pedalFreq1: "1 vez por semana",
    pedalFreq2: "2-3 veces por semana",
    pedalFreq3: "4-5 veces por semana",
    pedalFreqDaily: "Diariamente",
    pedalFreqRarely: "Raramente",
    howFoundUs: "¿Cómo Nos Encontraste?",
    howFoundInternet: "Por internet",
    howFoundInstagram: "Instagram",
    howFoundFriend: "Recomendación de amigo",
    howFoundShopify: "Sitio web / Shopify",
    howFoundOther: "Otro",

    whatsapp: "Teléfono/WhatsApp",
    whatsappPlaceholder: "(48) 99999-9999",
    email: "Correo Electrónico",
    emailPlaceholder: "tu@correo.com",
    instagram: "Instagram",
    instagramPlaceholder: "@tu.perfil",
    accommodation: "¿Dónde Te Hospedas?",
    accommodationPlaceholder: "Hotel, hostal, airbnb...",
    accommodationHint: "Barrio o nombre del lugar en Floripa.",

    zipCode: "Código Postal (CEP)",
    zipCodePlaceholder: "00000-000",
    zipCodeSearching: "Buscando...",
    state: "Estado",
    statePlaceholder: "Seleccionar",
    city: "Ciudad",
    cityPlaceholder: "Tu ciudad",
    street: "Dirección",
    streetPlaceholder: "Calle, Avenida...",
    number: "Número",
    numberPlaceholder: "Nº",
    complement: "Complemento",
    complementPlaceholder: "Apto, bloque...",
    neighborhood: "Barrio",
    neighborhoodPlaceholder: "Tu barrio",

    docPhotosDescription:
      "Sube el frente y el reverso de tu RG o Pasaporte. Ambas fotos son obligatorias para continuar.",
    docFront: "Frente del documento",
    docBack: "Reverso del documento",
    docUploadHint: "Haz clic o arrastra aquí",
    docUploadFormats: "JPG, PNG o HEIC · Máx. 10 MB",
    docUploading: "Subiendo...",
    docUploadSuccess: "Subido con éxito",
    docUploadError: "Error al subir. Inténtalo de nuevo.",

    loadingBikes: "Cargando bicicletas...",
    noBikesAvailable: "No hay bicicletas disponibles en este momento.",
    perDay: "/día",
    selectBike: "Seleccionar",
    selected: "Seleccionada",
    available: "Disponible",
    unavailable: "No disponible",
    checkAvailability: "Verificar disponibilidad",
    bikeAvailable: "Disponible para el período seleccionado",
    bikeUnavailable: "No disponible para el período seleccionado",

    startDate: "Fecha de Inicio",
    endDate: "Fecha de Devolución",
    deliveryTime: "Hora de Entrega",
    selectTime: "Selecciona la hora",
    days: "días",
    day: "día",

    noAccessories: "No hay accesorios disponibles.",
    accessoryUnit: "un.",

    paymentCard: "Tarjeta de Crédito",
    paymentPix: "Pix",
    paymentCash: "Pagar en la Entrega",
    paymentCashDesc: "Paga en persona al momento de la entrega",

    summaryTitle: "Resumen",
    summaryBike: "Bicicleta",
    summaryDelivery: "Tarifa de entrega",
    summaryAccessories: "Accesorios",
    summaryDiscount: "Descuento",
    summaryTotal: "Total",
    summaryFree: "Gratis",

    lgpdTitle: "Términos de uso y privacidad",
    lgpdText:
      "Al enviar este formulario, tus datos personales serán recopilados por Bike To Go Floripa exclusivamente para fines de registro, control de alquiler de bicicletas y comunicación por WhatsApp. Tu información será tratada de forma segura y confidencial, conforme a la Ley General de Protección de Datos de Brasil (LGPD, Ley nº 13.709/2018). Puedes solicitar la eliminación o corrección de tus datos en cualquier momento contactándonos por correo electrónico o WhatsApp.",
    lgpdConsent:
      "He leído y acepto los términos anteriores y autorizo el uso de mis datos personales conforme a la LGPD.",

    lgpdVerPolitica: "Leer la política de privacidad completa",
    lgpdFecharPolitica: "Cerrar",
    lgpdPolitica: [
      {
        titulo: "Quién trata tus datos",
        corpo:
          "El responsable de los datos es Bike To Go Floripa (C M Baptistotti Esportes LTDA, CNPJ 43.247.917/0001-06), con sede en Florianópolis, Brasil. Contacto: biketogo.floripa@gmail.com o WhatsApp +55 (48) 98863-1669.",
      },
      {
        titulo: "Qué datos recopilamos",
        corpo:
          "Nombre completo, fecha de nacimiento, documento de identidad o pasaporte, altura y peso, teléfono, correo electrónico, Instagram, dirección, lugar de alojamiento y frecuencia con que pedaleas. También recopilamos la IMAGEN de tu documento de identidad con foto, que subes en este formulario.",
      },
      {
        titulo: "Para qué los usamos",
        corpo:
          "Para identificarte en el contrato de alquiler, reservar la bicicleta y los accesorios, coordinar la entrega y la devolución, emitir el contrato y el recibo, y comunicarnos contigo por WhatsApp o correo sobre tu reserva. La base legal es la ejecución del contrato de alquiler (art. 7, V de la LGPD brasileña). El marketing solo se envía si marcas la casilla específica, y puedes cancelarlo cuando quieras.",
      },
      {
        titulo: "Con quién los compartimos",
        corpo:
          "No vendemos tus datos. Se almacenan y procesan en las empresas que operan nuestra infraestructura: Supabase (base de datos y almacenamiento de archivos), Railway (alojamiento del sistema), Resend (envío de los correos de reserva y recibo) y ViaCEP (consulta de dirección por código postal). Actúan como encargadas del tratamiento y solo pueden usar los datos para prestar ese servicio.",
      },
      {
        titulo: "Dónde se almacenan tus datos",
        corpo:
          "La base de datos y los archivos que subes se almacenan en servidores en Brasil. La excepción es el servicio de correo: los registros de envío de los mensajes de reserva y recibo se almacenan en Estados Unidos, lo que constituye una transferencia internacional de datos (art. 33 de la LGPD). Ocurre únicamente para comunicarnos contigo sobre tu reserva y está sujeta a las garantías contractuales exigidas por la legislación brasileña.",
      },
      {
        titulo: "El enlace de tu contrato",
        corpo:
          "Cuando se registra la reserva te enviamos por correo un enlace exclusivo donde puedes seguir tu contrato sin contraseña. Quien tenga ese enlace puede ver los datos del contrato, así que no lo compartas.",
      },
      {
        titulo: "Cuánto tiempo los guardamos",
        corpo:
          "Conservamos tus datos mientras dure la relación de alquiler y durante el plazo necesario para cumplir obligaciones legales y fiscales. Los registros archivados que nunca se convirtieron en alquiler se eliminan automáticamente tras el plazo definido en el sistema. Puedes pedir la eliminación antes, salvo lo que la ley obliga a conservar.",
      },
      {
        titulo: "Tus derechos",
        corpo:
          "En cualquier momento y sin costo puedes confirmar si tratamos tus datos, acceder a ellos, corregir información incompleta o desactualizada, solicitar anonimización o eliminación, pedir la portabilidad, saber con quién los compartimos y revocar el consentimiento (art. 18 de la LGPD). Para ejercer cualquiera de estos derechos, escribe a biketogo.floripa@gmail.com. También puedes reclamar ante la ANPD.",
      },
    ] as Array<{ titulo: string; corpo: string }>,

    submitButton: "Enviar por WhatsApp",
    submitButtonCash: "Confirmar reserva",
    submitting: "Enviando...",
    submitHint:
      "Al hacer clic, serás redirigido a WhatsApp con todos los datos completados.",

    successTitle: "¡Reserva enviada con éxito!",
    successMessage:
      "Recibimos tu pre-registro. Nuestro equipo se pondrá en contacto por WhatsApp en breve para confirmar los detalles.",
    errorTitle: "Error al enviar",
    errorMessage:
      "Ocurrió un error al enviar tu formulario. Por favor, inténtalo de nuevo.",
    duplicateMessage:
      "Ya existe un registro con estos datos. Escribe a la tienda por WhatsApp para continuar con tu reserva.",

    required: "Campo obligatorio",
    invalidEmail: "Correo electrónico inválido",
    invalidPhone: "Teléfono inválido",
    invalidCpf: "CPF inválido",
    invalidDate: "Fecha inválida",
    mustAcceptLgpd: "Debes aceptar los términos para continuar",
    mustSelectBike: "Selecciona una bicicleta",
    mustSelectDates: "Selecciona las fechas del alquiler",
    mustSelectTime: "Selecciona la hora de entrega",
    mustSelectPayment: "Selecciona una forma de pago",
    mustUploadDocs: "Sube las fotos del documento",
    // Cart (multi-bike)
    addToCart: "Agregar al carrito",
    removeFromCart: "Quitar",
    cartTitle: "Carrito de Bicis",
    cartEmpty: "Ninguna bici en el carrito. Selecciona una bici, talla y fechas arriba.",
    cartItemSummary: "bici(s) en el carrito",
    cartTotal: "Total del Carrito",
    mustAddToCart: "Agrega al menos una bici al carrito",
  },
} as const;

export type TranslationKey = keyof typeof translations.pt;

export function useTranslation(lang: Language) {
  const t = translations[lang];
  return { t };
}
