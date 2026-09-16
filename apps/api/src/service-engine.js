const SERVICES = [
  { id:'revisao-portugues', name:'Revisão e correção de texto', category:'Texto', description:'Correção de ortografia, gramática, pontuação e clareza.', unit:'até 1.000 palavras', startingPrice:19.90, delivery:'até 24h' },
  { id:'traducao-pt-en', name:'Tradução Português → Inglês', category:'Tradução', description:'Tradução de textos gerais com revisão e adaptação de linguagem.', unit:'até 500 palavras', startingPrice:24.90, delivery:'até 24h' },
  { id:'traducao-en-pt', name:'Tradução Inglês → Português', category:'Tradução', description:'Tradução de textos gerais para português do Brasil, com revisão.', unit:'até 500 palavras', startingPrice:24.90, delivery:'até 24h' },
  { id:'reescrita', name:'Reescrita e melhoria de texto', category:'Texto', description:'Transformação de um texto para ficar mais claro, profissional e natural.', unit:'até 1.000 palavras', startingPrice:24.90, delivery:'até 24h' },
  { id:'curriculo', name:'Currículo profissional', category:'Carreira', description:'Organização e redação de currículo objetivo, claro e profissional.', unit:'1 currículo', startingPrice:39.90, delivery:'até 48h' },
  { id:'carta-apresentacao', name:'Carta de apresentação', category:'Carreira', description:'Texto personalizado para candidatura a vaga ou oportunidade.', unit:'1 carta', startingPrice:29.90, delivery:'até 24h' },
  { id:'legendas-redes', name:'Legendas para redes sociais', category:'Marketing', description:'Pacote de legendas prontas para divulgação de produtos, serviços ou conteúdo.', unit:'5 legendas', startingPrice:39.90, delivery:'até 48h' },
  { id:'descricao-produto', name:'Descrição de produto', category:'Vendas', description:'Descrição persuasiva e organizada para marketplace, loja ou catálogo.', unit:'até 1 produto', startingPrice:19.90, delivery:'até 24h' },
  { id:'whatsapp-empresa', name:'Mensagens para WhatsApp comercial', category:'Vendas', description:'Mensagens de atendimento, apresentação de oferta e pós-venda.', unit:'5 mensagens', startingPrice:29.90, delivery:'até 24h' },
  { id:'email-profissional', name:'E-mail profissional', category:'Texto', description:'Redação ou revisão de e-mails para clientes, empresas ou situações profissionais.', unit:'1 e-mail', startingPrice:14.90, delivery:'até 24h' }
];

export function listServices(){ return SERVICES.map(service => ({...service})); }
export function findService(id){ return SERVICES.find(service => service.id === id) || null; }
export function buildServiceRequest({serviceId, customerName='', customerContact='', brief=''}){
  const service=findService(serviceId);
  if(!service) throw new Error('SERVICE_NOT_FOUND');
  return {
    id:`srv_${crypto.randomUUID()}`,
    serviceId:service.id,
    serviceName:service.name,
    customerName:String(customerName).trim(),
    customerContact:String(customerContact).trim(),
    brief:String(brief).trim(),
    startingPrice:service.startingPrice,
    status:'quote_requested',
    createdAt:new Date().toISOString()
  };
}
