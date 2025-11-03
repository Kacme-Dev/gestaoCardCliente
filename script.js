// Chave para armazenar o array de todos os clientes no LocalStorage
const CLIENTS_ARRAY_KEY = 'allClientCards';

let clients = []; 
let currentClientId = null; 
let clientTarefas = []; 

document.addEventListener('DOMContentLoaded', () => {
    loadAllClients(); 
    setupEventListeners();
    clearFormData(); 
});

// --- Utilidade ---

/** Retorna a data de hoje no formato YYYY-MM-DD para comparação. */
function getTodayDateString() {
    const now = new Date();
    // Ajusta o fuso horário para garantir a data correta
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Novo: Verifica se a tarefa está pendente e o prazo já passou. */
function isTaskOverdue(tarefa) {
    if (tarefa.concluida || !tarefa.due_date) {
        return false;
    }
    // A tarefa está em atraso se o prazo for anterior ao dia de hoje
    return tarefa.due_date < getTodayDateString(); 
}

// --- Persistência de Dados ---

function loadAllClients() {
    clients = JSON.parse(localStorage.getItem(CLIENTS_ARRAY_KEY) || '[]');
}

function saveAllClients() {
    localStorage.setItem(CLIENTS_ARRAY_KEY, JSON.stringify(clients));
}

// --- Cliente CRUD: Busca (READ) ---

function searchClient(query) {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    // 1. Tenta buscar por Código exato (Maior prioridade)
    let foundClient = clients.find(client => client.codigo.toLowerCase() === q);
    if (foundClient) {
        return foundClient;
    }
    
    // 2. Tenta buscar por Nome do Cliente (que contenha a query)
    foundClient = clients.find(client => 
        client['nome-cliente'].toLowerCase().includes(q)
    );

    return foundClient;
}

function loadClientData(client) {
    currentClientId = client.codigo;
    document.getElementById('current-client-id').value = client.codigo;
    document.getElementById('current-client-info').textContent = `Cliente Carregado: ${client.codigo} - ${client['nome-cliente']}`;
    
    // 1. Preencher Formulário
    const form = document.getElementById('client-form');
    form.querySelectorAll('input, textarea').forEach(element => {
        const key = element.id;
        if (client[key] !== undefined) { 
            element.value = client[key];
        } else {
            element.value = '';
        }
    });

    document.querySelectorAll('input[name="plano"]').forEach(checkbox => {
        checkbox.checked = client.planos && client.planos.includes(checkbox.value);
    });

    // 2. Carregar Tarefas (ESTA FUNÇÃO GARANTE A EXIBIÇÃO)
    loadTarefas(client.tarefas || []); 

    // 3. Atualizar Contador 
    updateCountdown(client['data-inicio']);
}

function clearFormData() {
    currentClientId = null;
    clientTarefas = []; 

    document.getElementById('current-client-id').value = '';
    document.getElementById('current-client-info').textContent = 'Pronto para Novo Cadastro. Preencha o Código.';

    const form = document.getElementById('client-form');
    form.reset(); 
    
    document.getElementById('search-input').value = '';

    renderTarefas(); 
    updateCountdown(''); 
}


// --- Salvar/Atualizar Dados ---

function saveOrUpdateClient() {
    const clientData = {};
    const form = document.getElementById('client-form');
    const codigo = document.getElementById('codigo').value.trim();
    const nomeCliente = document.getElementById('nome-cliente').value.trim();
    
    if (!codigo || !nomeCliente) {
        alert("Os campos 'Código' e 'Nome Cliente' são obrigatórios.");
        return false;
    }
    
    form.querySelectorAll('input, textarea').forEach(element => {
         const key = element.id;
        if (element.type !== 'checkbox' && key) {
            clientData[key] = element.value;
        }
    });

    clientData.planos = Array.from(document.querySelectorAll('input[name="plano"]:checked')).map(cb => cb.value);
    clientData.tarefas = clientTarefas; 
    
    let existingIndex = clients.findIndex(client => client.codigo === codigo);

    if (existingIndex !== -1) {
        clients[existingIndex] = { ...clients[existingIndex], ...clientData };
        alert(`Cliente ${codigo} - ${nomeCliente} atualizado com sucesso!`);
    } else {
        if (clients.some(client => client.codigo === codigo)) {
             alert(`Erro: O código '${codigo}' já está em uso por outro cliente.`);
             return false;
        }
        
        clients.push(clientData);
        alert(`Novo cliente ${codigo} - ${nomeCliente} cadastrado com sucesso!`);
    }
    
    saveAllClients();
    
    currentClientId = codigo; 
    loadClientData(clientData); 
    
    return true;
}

function deleteCurrentClient() {
    // ... (função inalterada) ...
}


// --- Gerenciamento de Ações/Tarefas (Checklist) ---

function loadTarefas(tarefasArray) {
    clientTarefas = tarefasArray;
    renderTarefas();
}

function saveTarefas() {
    if (currentClientId) {
        let client = clients.find(c => c.codigo === currentClientId);
        if (client) {
            client.tarefas = clientTarefas;
            saveAllClients();
        }
    }
}

function renderTarefas() {
    const listContainer = document.getElementById('tarefas-list');
    listContainer.innerHTML = ''; 

    clientTarefas.forEach((tarefa, index) => {
        const itemDiv = document.createElement('div');
        
        // NOVO: Define a classe de estilo com base no status
        let statusClass = '';
        if (tarefa.concluida) {
            statusClass = 'completed-task';
        } else if (isTaskOverdue(tarefa)) {
            statusClass = 'overdue-task'; // EM ATRASO
        }
        itemDiv.className = statusClass;
        
        // Verifica a data para exibição
        const prazoText = tarefa.due_date ? 
            `<span style="font-weight: normal; margin-left: 10px;">Prazo: ${new Date(tarefa.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>` : '';

        // Texto do Status
        let statusDisplay = '';
        if (tarefa.concluida) {
            statusDisplay = ' (CONCLUÍDO/ARQUIVADO)';
        } else if (isTaskOverdue(tarefa)) {
            statusDisplay = ' (!!! EM ATRASO)';
        } else {
            statusDisplay = ' (A FAZER)';
        }


        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = tarefa.concluida;
        // O checkbox atua como o botão "Concluído" ou "A Fazer"
        checkbox.addEventListener('change', () => {
            toggleTarefa(index);
            saveTarefas(); 
        });

        const label = document.createElement('span');
        label.innerHTML = `${tarefa.descricao} <strong style="font-size: 0.9em;">${statusDisplay}</strong> ${prazoText}`;
        label.className = 'task-label';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.className = 'delete-task-btn';
        deleteBtn.addEventListener('click', () => {
            deleteTarefa(index);
            saveTarefas(); 
        });

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);
        itemDiv.appendChild(deleteBtn);
        listContainer.appendChild(itemDiv);
    });
}

function addTarefa() {
    const input = document.getElementById('nova-tarefa');
    const dateInput = document.getElementById('tarefa-due-date');
    const descricao = input.value.trim();
    const dueDate = dateInput.value; 

    if (!currentClientId) {
        alert("Você deve carregar ou cadastrar um cliente antes de adicionar tarefas.");
        return;
    }

    if (descricao) {
        clientTarefas.push({ 
            descricao, 
            concluida: false,
            due_date: dueDate 
        });
        input.value = '';
        dateInput.value = ''; 
        saveTarefas(); 
        renderTarefas();
    }
}

function toggleTarefa(index) {
    if (clientTarefas[index]) {
        clientTarefas[index].concluida = !clientTarefas[index].concluida;
    }
    // Chame renderTarefas aqui para que a mudança de estilo seja instantânea
    renderTarefas();
}

function deleteTarefa(index) {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
        clientTarefas.splice(index, 1);
        renderTarefas(); // Atualiza a lista após exclusão
    }
}

// --- Lógica de Lembretes Diários ---

function showDailyReminders() {
    const today = getTodayDateString();
    const remindersList = document.getElementById('reminders-list-output');
    remindersList.innerHTML = '';
    let hasReminders = false;

    clients.forEach(client => {
        if (client.tarefas && client.tarefas.length > 0) {
            // Filtra tarefas que não estão concluídas e que tem o prazo hoje OU estão em atraso
            const pendingOrOverdueTasks = client.tarefas.filter(t => 
                !t.concluida && (t.due_date === today || isTaskOverdue(t))
            );

            if (pendingOrOverdueTasks.length > 0) {
                hasReminders = true;
                const clientDiv = document.createElement('div');
                clientDiv.innerHTML = `
                    <strong>Cliente: ${client.codigo} - ${client['nome-cliente']}</strong>
                    <ul>
                        ${pendingOrOverdueTasks.map(t => {
                            const status = isTaskOverdue(t) ? ' (EM ATRASO)' : ' (HOJE)';
                            const prazo = t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Sem Prazo';
                            return `<li>${t.descricao} <span style="color: #dc3545;">${status}</span> - Prazo: ${prazo}</li>`;
                        }).join('')}
                    </ul>
                `;
                remindersList.appendChild(clientDiv);
            }
        }
    });

    if (!hasReminders) {
        remindersList.innerHTML = '<p style="color: #888;">Nenhuma ação de trabalho pendente com prazo para hoje ou em atraso.</p>';
    }

    const modal = document.getElementById('reminder-modal');
    modal.style.display = 'block';
}

// --- Lógica do Modal / Event Listeners ---
// ... (restante do código setupModalListeners e setupEventListeners inalterado) ...
function setupModalListeners() {
    const modal = document.getElementById('reminder-modal');
    const closeBtn = document.querySelector('.close-btn');

    // Fecha ao clicar no X
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    // Fecha ao clicar fora do modal
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}


// --- Configuração de Eventos ---

function setupEventListeners() {
    setupModalListeners();
    
    // 1. Salvar dados 
    document.getElementById('client-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveOrUpdateClient();
    });

    // 2. Buscar Cliente (REVISADO: Usa a nova lógica de busca com prioridade por Código)
    const searchButton = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    const handleSearch = () => {
        const query = searchInput.value;
        const foundClient = searchClient(query);

        if (foundClient) {
            loadClientData(foundClient);
            document.getElementById('codigo').value = foundClient.codigo;
            searchInput.value = ''; 
        } else {
            alert(`Cliente não encontrado para a busca: "${query}". Limpando formulário para novo cadastro.`);
            clearFormData();
        }
    };

    searchButton.addEventListener('click', handleSearch);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    });

    // 3. Novo Cliente
    document.getElementById('new-client-btn').addEventListener('click', () => {
        clearFormData();
    });

    // 4. Excluir Cliente 
    document.getElementById('delete-btn').addEventListener('click', deleteCurrentClient);

    // 5. Adicionar tarefa
    document.getElementById('add-tarefa-btn').addEventListener('click', addTarefa);

    // 6. Adicionar tarefa com Enter
    document.getElementById('nova-tarefa').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTarefa();
        }
    });
    
    // 7. Mostrar Lembretes Diários
    document.getElementById('show-reminders-btn').addEventListener('click', showDailyReminders);
}