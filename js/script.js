// Script principal para o Portal de Chamados
document.addEventListener('DOMContentLoaded', function() {
    console.log("JS carregado!");
    
    // Verificar se estamos na página de dashboard
    const ticketsTable = document.getElementById('tickets-table');
    const refreshButton = document.getElementById('refresh-tickets');
    
    if (ticketsTable && refreshButton) {
        console.log("Dashboard detectado. Configurando recursos AJAX...");
        setupDashboardFeatures();
    }
    
    // Adicionar container para notificações toast globalmente
    addToastContainer();
});

/**
 * Adiciona um container para notificações toast
 */
function addToastContainer() {
    if (!document.querySelector('.toast-container')) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

/**
 * Configura funcionalidades do dashboard
 */
function setupDashboardFeatures() {
    const refreshButton = document.getElementById('refresh-tickets');
    const ticketsTable = document.getElementById('tickets-table');
    const filterForm = document.querySelector('form[method="GET"]');
    const pesquisaInput = document.querySelector('input[name="pesquisa"]');
    const teamSelect = document.querySelector('select[name="team_id"]');
    
    let isLoading = false;
    
    // Adicionar manipulador de eventos para o botão de refresh
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            fetchTickets();
            updateLastRefreshTime();
        });
    }
    
    // Converter o formulário de filtro para usar AJAX
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            fetchTickets();
        });
        
        // Adicionar filtragem instantânea para o campo de pesquisa (com debounce)
        if (pesquisaInput) {
            let debounceTimer;
            pesquisaInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function() {
                    fetchTickets();
                }, 500); // Esperar 500ms após a última digitação
            });
        }
        
        // Filtrar instantaneamente ao mudar a equipe
        if (teamSelect) {
            teamSelect.addEventListener('change', function() {
                fetchTickets();
            });
        }
    }
    
    // Adicionar opção de auto-refresh
    addAutoRefreshToggle();
    
    // Função para buscar tickets via AJAX
    function fetchTickets() {
        // Evitar múltiplas requisições simultâneas
        if (isLoading) return;
        isLoading = true;
        
        // Feedback visual
        if (refreshButton) {
            refreshButton.textContent = 'Carregando...';
            refreshButton.disabled = true;
        }
        
        // Construir parâmetros para a busca
        const params = new URLSearchParams();
        if (pesquisaInput) params.append('pesquisa', pesquisaInput.value);
        if (teamSelect) params.append('team_id', teamSelect.value);
        
        // Fazer a requisição
        fetch('api_tickets.php?' + params.toString())
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro na resposta da rede');
                }
                return response.json();
            })
            .then(data => {
                updateTicketsTable(data);
                showToast('success', 'Lista de chamados atualizada com sucesso');
            })
            .catch(error => {
                console.error('Erro ao carregar chamados:', error);
                showToast('error', 'Erro ao atualizar chamados');
            })
            .finally(() => {
                // Restaurar o botão
                if (refreshButton) {
                    refreshButton.textContent = 'Atualizar via API';
                    refreshButton.disabled = false;
                }
                isLoading = false;
            });
    }
    
    // Função para atualizar a tabela de chamados
    function updateTicketsTable(tickets) {
        // Encontrar o tbody da tabela
        const tableBody = ticketsTable.querySelector('tbody');
        if (!tableBody) return;
        
        // Limpar o conteúdo atual
        tableBody.innerHTML = '';
        
        // Se não houver chamados
        if (tickets.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" class="no-records">Nenhum chamado encontrado</td>';
            tableBody.appendChild(row);
            return;
        }
        
        // Adicionar cada chamado à tabela
        tickets.forEach(ticket => {
            const row = document.createElement('tr');
            row.dataset.id = ticket.id;
            
            // Adicionar classes para estados e prioridades
            if (ticket.estado === 'Fechado') {
                row.classList.add('status-closed');
            }
            if (ticket.prioridade === 'Critico') {
                row.classList.add('priority-critical');
            }
            if (ticket.prioridade === 'Alto') {
                row.classList.add('priority-high');
            }
            
            row.innerHTML = `
                <td>${ticket.id}</td>
                <td>${escapeHtml(ticket.titulo)}</td>
                <td data-field="estado">${ticket.estado}</td>
                <td data-field="prioridade">${ticket.prioridade}</td>
                <td>${ticket.tipo}</td>
                <td>
                    <a href="ticket.php?id=${ticket.id}" class="action-link">Ver Detalhes</a>
                </td>
            `;
            
            // Adicionar a linha com animação
            tableBody.appendChild(row);
            row.classList.add('fade-in');
        });
    }
    
    // Função para atualizar o texto de última atualização
    function updateLastRefreshTime() {
        const lastUpdateSpan = document.getElementById('last-update-time');
        if (lastUpdateSpan) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString();
            lastUpdateSpan.textContent = `Última atualização: ${timeStr}`;
        }
    }
    
    // Adicionar toggle para auto-refresh
    function addAutoRefreshToggle() {
        // Verificar se já existe
        if (document.querySelector('.auto-refresh-toggle')) return;
        
        // Criar o elemento
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'auto-refresh-toggle';
        toggleContainer.innerHTML = `
            <label>
                <input type="checkbox" id="auto-refresh-checkbox"> 
                Auto-atualizar a cada <select id="refresh-interval">
                    <option value="30000">30s</option>
                    <option value="60000" selected>1min</option>
                    <option value="300000">5min</option>
                </select>
            </label>
        `;
        
        // Inserir após o botão de refresh
        if (refreshButton) {
            refreshButton.parentNode.insertBefore(toggleContainer, refreshButton.nextSibling);
        }
        
        // Configurar funcionamento
        const checkbox = document.getElementById('auto-refresh-checkbox');
        const intervalSelect = document.getElementById('refresh-interval');
        let refreshTimer = null;
        let refreshInterval = 60000; // 1 minuto padrão
        
        if (checkbox && intervalSelect) {
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    // Iniciar auto-refresh
                    startAutoRefresh();
                    showToast('info', `Auto-atualização ativada a cada ${intervalSelect.options[intervalSelect.selectedIndex].text}`);
                } else {
                    // Parar auto-refresh
                    stopAutoRefresh();
                    showToast('info', 'Auto-atualização desativada');
                }
            });
            
            intervalSelect.addEventListener('change', function() {
                refreshInterval = parseInt(this.value);
                
                if (checkbox.checked) {
                    // Reiniciar o timer com o novo intervalo
                    stopAutoRefresh();
                    startAutoRefresh();
                    showToast('info', `Intervalo alterado para ${this.options[this.selectedIndex].text}`);
                }
            });
        }
        
        function startAutoRefresh() {
            stopAutoRefresh(); // Garantir que não haja duplicação
            
            refreshTimer = setInterval(function() {
                if (!isLoading) {
                    fetchTickets();
                    updateLastRefreshTime();
                }
            }, refreshInterval);
        }
        
        function stopAutoRefresh() {
            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        }
    }
}

/**
 * Mostra uma notificação toast
 * @param {string} type - Tipo de notificação: success, error, info, warning
 * @param {string} message - Mensagem a ser mostrada
 */
function showToast(type, message) {
    // Encontrar ou criar o container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Criar o toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Adicionar ao container
    container.appendChild(toast);
    
    // Mostrar o toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remover após alguns segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a ser escapado
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}