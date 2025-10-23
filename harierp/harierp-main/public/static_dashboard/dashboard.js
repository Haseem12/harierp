
document.addEventListener('DOMContentLoaded', function() {
    // Mock data - in a real scenario, this would come from an API
    const summaryStatsData = {
        totalRevenue: 12530.75,
        totalSales: 152,
        pendingInvoices: 12,
        lowStockItems: 3,
    };

    const recentActivitiesData = [
        {
            id: 'sale-1', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), type: 'Sale', title: 'Sale #S00234', 
            subtitle: 'Customer: John Doe', amount: 45.99, icon: '🛒', iconClass: 'sale', link: '#'
        },
        {
            id: 'invoice-1', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), type: 'Invoice', title: 'Invoice #INV-0123', 
            subtitle: 'Status: Sent', amount: 102.50, icon: '📄', iconClass: 'invoice', link: '#'
        },
        {
            id: 'product-1', date: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000), type: 'Product Added', title: 'Product Added', 
            subtitle: 'Berry Blast Yogurt', icon: '📦', iconClass: 'product', link: '#'
        },
        {
            id: 'sale-2', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), type: 'Sale', title: 'Sale #S00231', 
            subtitle: 'Customer: Jane Smith', amount: 75.00, icon: '🛒', iconClass: 'sale', link: '#'
        },
        {
            id: 'product-2', date: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000), type: 'Product Low Stock', title: 'Low Stock Alert', 
            subtitle: 'Vanilla Bean Yogurt', icon: '⚠️', iconClass: 'product-alert', link: '#'
        },
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    // Helper function to format currency (NGN for Naira)
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    }

    // Helper function to format date
    function formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Populate Summary Stats
    document.getElementById('totalRevenueValue').textContent = formatCurrency(summaryStatsData.totalRevenue);
    document.getElementById('totalSalesValue').textContent = `+${summaryStatsData.totalSales}`;
    document.getElementById('pendingInvoicesValue').textContent = summaryStatsData.pendingInvoices;
    document.getElementById('lowStockItemsValue').textContent = summaryStatsData.lowStockItems;

    // Populate Recent Activity
    const activityList = document.getElementById('recentActivityList');
    if (activityList) {
        if (recentActivitiesData.length > 0) {
            recentActivitiesData.forEach(activity => {
                const listItem = document.createElement('li');
                
                const activityItemDiv = document.createElement('div');
                activityItemDiv.className = 'activity-item';

                const iconSpan = document.createElement('span');
                iconSpan.className = `activity-icon ${activity.iconClass}`;
                iconSpan.textContent = activity.icon;
                activityItemDiv.appendChild(iconSpan);

                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'activity-details';
                
                const titleP = document.createElement('p');
                titleP.className = 'title';
                if (activity.link) {
                    const linkA = document.createElement('a');
                    linkA.href = activity.link;
                    linkA.textContent = activity.title;
                    titleP.appendChild(linkA);
                } else {
                    titleP.textContent = activity.title;
                }
                detailsDiv.appendChild(titleP);
                
                const subtitleP = document.createElement('p');
                subtitleP.className = 'subtitle';
                subtitleP.textContent = activity.subtitle;
                detailsDiv.appendChild(subtitleP);
                
                activityItemDiv.appendChild(detailsDiv);
                listItem.appendChild(activityItemDiv);

                const metaDiv = document.createElement('div');
                metaDiv.className = 'activity-meta';

                if (activity.amount !== undefined) {
                    const amountSpan = document.createElement('span');
                    amountSpan.className = 'amount';
                    amountSpan.textContent = formatCurrency(activity.amount);
                    metaDiv.appendChild(amountSpan);
                }
                
                const dateP = document.createElement('p');
                dateP.className = 'date';
                dateP.textContent = formatDate(activity.date);
                metaDiv.appendChild(dateP);

                listItem.appendChild(metaDiv);
                activityList.appendChild(listItem);
            });
        } else {
            const noActivityP = document.createElement('p');
            noActivityP.textContent = 'No recent activities found.';
            activityList.appendChild(noActivityP);
        }
    }
});
