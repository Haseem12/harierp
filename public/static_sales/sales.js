document.addEventListener('DOMContentLoaded', function () {
    const mockSales = [
        {
            id: 'sale_001',
            customer: { name: 'Alice Wonderland' },
            saleDate: new Date(new Date().setDate(new Date().getDate() - 7)),
            status: 'Completed',
            totalAmount: 5150.00,
        },
        {
            id: 'sale_002',
            customer: { name: 'Bob The Builder' },
            saleDate: new Date(),
            status: 'Pending',
            totalAmount: 5287.50,
        },
        {
            id: 'sale_003',
            customer: { name: 'Good Foods Retail' },
            saleDate: new Date(new Date().setDate(new Date().getDate() - 2)),
            status: 'Completed',
            totalAmount: 12037.50,
        },
        {
            id: 'sale_004',
            customer: { name: 'Regional Distributors Inc.' },
            saleDate: new Date(new Date().setDate(new Date().getDate() - 10)),
            status: 'Cancelled',
            totalAmount: 8000.00,
        },
    ];

    const salesTableBody = document.getElementById('salesTableBody');
    const searchInput = document.getElementById('searchInput');
    const salesTableFooter = document.getElementById('salesTableFooter');

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    }

    function formatDate(date) {
        if (!date || isNaN(new Date(date).getTime())) {
            return 'N/A';
        }
        // Simple date formatter: Month Day, Year
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(date).toLocaleDateString('en-US', options);
    }

    function getStatusBadgeClass(status) {
        switch (status.toLowerCase()) {
            case 'completed': return 'badge-completed';
            case 'pending': return 'badge-pending';
            case 'cancelled': return 'badge-cancelled';
            default: return 'badge-outline';
        }
    }

    function renderSalesTable(salesData) {
        if (!salesTableBody) return;
        salesTableBody.innerHTML = ''; // Clear existing rows

        if (salesData.length === 0) {
            salesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No sales match your search.</td></tr>';
        } else {
            salesData.forEach(sale => {
                const row = salesTableBody.insertRow();
                row.insertCell().textContent = sale.id;
                row.insertCell().textContent = sale.customer.name;
                row.insertCell().textContent = formatDate(sale.saleDate);
                
                const statusCell = row.insertCell();
                const statusBadge = document.createElement('span');
                statusBadge.className = `badge ${getStatusBadgeClass(sale.status)}`;
                statusBadge.textContent = sale.status;
                statusCell.appendChild(statusBadge);

                const amountCell = row.insertCell();
                amountCell.textContent = formatCurrency(sale.totalAmount);
                amountCell.className = 'text-right';

                const actionsCell = row.insertCell();
                actionsCell.className = 'table-actions';
                // Simplified actions for static version
                const viewButton = document.createElement('button');
                viewButton.textContent = 'View';
                viewButton.onclick = () => alert(`Viewing details for ${sale.id} (static example)`);
                actionsCell.appendChild(viewButton);
            });
        }
        
        if (salesTableFooter) {
            salesTableFooter.textContent = `Showing ${salesData.length} of ${mockSales.length} sales`;
        }
    }

    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredSales = mockSales.filter(sale =>
            sale.id.toLowerCase().includes(searchTerm) ||
            sale.customer.name.toLowerCase().includes(searchTerm) ||
            sale.status.toLowerCase().includes(searchTerm)
        );
        renderSalesTable(filteredSales);
    });

    // Initial render
    renderSalesTable(mockSales);
});
