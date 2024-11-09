class ChatUI {
    constructor() {
        // 初始化基本元素
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.messages = [];
        
        // 初始化API客户端
        this.chatAPI = new ChatAPI('1bd6aa413d90ee8d35832debdfe92554.uu8dPZKS8LX4baw0');
        
        // 初始化用户名
        this.userNameElement = document.querySelector('.user-info span');
        this.initializeUserName();
        
        // 初始化事件监听
        this.initializeEventListeners();
        
        // 初始化使用次数
        this.initializeUsageCount();
        
        // 获取显示对话次数的元素
        this.usageText = document.querySelector('.usage-text');
        this.progressBar = document.querySelector('.progress');
        
        // 获取侧边栏用户头像元素
        this.sidebarUserAvatar = document.querySelector('.user-info img');
        
        // 设置固定的猫咪头像URL
        const catImageUrl = 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=xiaoqi&backgroundColor=ffcfec';
        
        // 初始化头像
        this.avatars = {
            user: localStorage.getItem('userAvatar') || 'https://api.dicebear.com/7.x/adventurer/svg?seed=user',
            assistant: localStorage.getItem('assistantAvatar') || 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=xiaoqi'
        };
        
        // 修改Logo初始化
        this.logoImage = document.getElementById('logoImage');
        if (this.logoImage) {
            this.logoImage.src = catImageUrl;
            this.logoImage.style.cursor = 'default';
            this.logoImage.onclick = null;
            this.logoImage.title = '小七宝';
        }
        
        // 禁用AI头像的更换功能
        document.querySelectorAll('.assistant-avatar').forEach(img => {
            img.style.cursor = 'default';
            img.onclick = null;
            img.title = '小七宝';
        });
        
        // 初始化头像上传功能
        this.initializeAvatarUpload();
        
        // 立即更新所有头像显示
        this.updateAllAvatars();
        
        // 初始化记账数据
        this.initializeAccountBook();
        
        // 初始化记账面板
        this.initializeAccountPanel();
        
        // 初始化Logo和头像上传功能
        this.initializeLogoAndAvatarUpload();
    }

    initializeEventListeners() {
        // 发送按钮点击事件
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // 输入框回车事件
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 用户名点击事件
        if (this.userNameElement) {
            this.userNameElement.addEventListener('click', () => this.showUserNameDialog());
        }

        // 处理输入框高度自适应
        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = this.userInput.scrollHeight + 'px';
        });

        // 处理移动端键盘弹出
        this.userInput.addEventListener('focus', () => {
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
            }, 300);
        });
    }

    async sendMessage() {
        const content = this.userInput.value.trim();
        if (!content) return;

        try {
            // 检查剩余次数
            if (this.usageData.remainingUsage <= 0) {
                this.showActivationDialog();
                return;
            }

            // 添加用户消息到界面
            this.addMessage('user', content);
            this.userInput.value = '';

            // 添加消息到历史记录
            this.messages.push({ role: 'user', content });

            // 显示加载状态
            this.addLoadingMessage();

            // 如果是查询账单或记账请求
            const accountingResult = this.handleAccountingMessage(content);
            if (accountingResult) {
                this.removeLoadingMessage();
                this.addMessage('assistant', accountingResult.message);
                return;
            }

            // 正常的AI对话
            const response = await this.chatAPI.sendMessage([...this.messages]);
            
            this.removeLoadingMessage();

            if (response && response.choices && response.choices[0]) {
                // 减少剩余次数并保存
                this.usageData.remainingUsage--;
                this.updateUsageDisplay();
                this.saveUsageData();

                const aiResponse = response.choices[0].message.content;
                const formattedResponse = this.formatAIResponse(aiResponse);
                this.addMessage('assistant', formattedResponse);
                this.messages.push({ role: 'assistant', content: formattedResponse });
            }
        } catch (error) {
            console.error('发送消息错误:', error);
            this.removeLoadingMessage();
            this.addErrorMessage(error.message || '发送消息失败，请重试 (╥﹏╥)');
        }
    }

    addExpense(amount, category, description) {
        try {
            const expense = {
                amount: parseFloat(amount).toFixed(2),
                category: category,
                description: description,
                date: new Date().toISOString(),
                id: Date.now()
            };

            // 添加到支出记录
            this.accountBook.expenses.push(expense);
            
            // 更新类别总额
            this.accountBook.categories[category].total = 
                (parseFloat(this.accountBook.categories[category].total) + 
                 parseFloat(amount)).toFixed(2);
            
            // 保存到localStorage
            this.saveAccountBook();
            
            // 立即更新账单面板
            this.updateAccountPanel();
            
            console.log(`记录新支出: ${category} ¥${amount}`);
        } catch (error) {
            console.error('添加支出记录失败:', error);
            this.addMessage('assistant', '记录支出失败了，请重试 (｡•́︿•̀｡)');
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        // 获取当前时间
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const avatarUrl = role === 'user' ? this.avatars.user : this.avatars.assistant;
        const roleName = role === 'user' ? '我' : '小七宝';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <img src="${avatarUrl}" 
                     alt="${roleName}"
                     class="${role}-avatar"
                     title="${roleName}">
            </div>
            <div class="message-content-wrapper">
                <div class="message-header">
                    <span class="message-name">${roleName}</span>
                    <span class="message-time">${timeString}</span>
                </div>
                <div class="message-content">${content}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    addLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message loading-message';
        loadingDiv.id = 'loadingMessage';
        loadingDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
        this.chatMessages.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    removeLoadingMessage() {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error-message';
        errorDiv.innerHTML = `
            <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
            <div class="error-content">${message}</div>
        `;
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }

    initializeUserName() {
        try {
            // 从localStorage获取用户名，如果没有则使用默认值
            const savedName = localStorage.getItem('userName') || '点击设置昵称';
            if (this.userNameElement) {
                this.userNameElement.textContent = savedName;
                this.userNameElement.style.cursor = 'pointer';
                this.userNameElement.title = '点击修改昵称';
            }
        } catch (error) {
            console.error('初始化用户名失败:', error);
        }
    }

    showUserNameDialog() {
        const currentName = this.userNameElement.textContent;
        const newName = prompt('请输入您的昵称 (◕‿◕✿)', currentName === '点击设置昵称' ? '' : currentName);
        if (newName && newName.trim()) {
            this.updateUserName(newName.trim());
        }
    }

    updateUserName(newName) {
        try {
            this.userNameElement.textContent = newName;
            localStorage.setItem('userName', newName);
            alert('昵称修改成功！(｡♥‿♥｡)');
        } catch (error) {
            console.error('更新用户名失败:', error);
            alert('昵称修改失败了 (｡•́︿•̀｡) 请重试');
        }
    }

    // 添加使用次数初始方法
    initializeUsageCount() {
        try {
            // 从localStorage获取今日对话次数
            const today = new Date().toDateString();
            let usageData = JSON.parse(localStorage.getItem('chatUsageData'));
            
            // 如果没有数据或是新的一天，创建新的使用数据
            if (!usageData || usageData.date !== today) {
                usageData = {
                    date: today,
                    totalUsage: 15,  // 每日总次数
                    remainingUsage: 15  // 剩余次数
                };
            }

            this.usageData = usageData;
            this.updateUsageDisplay();
            this.saveUsageData();
        } catch (error) {
            console.error('初始化使用次数失败:', error);
            // 设置默认值
            this.usageData = {
                date: new Date().toDateString(),
                totalUsage: 15,
                remainingUsage: 15
            };
            this.updateUsageDisplay();
            this.saveUsageData();
        }
    }

    // 加更新显示方法
    updateUsageDisplay() {
        try {
            if (this.usageText) {
                this.usageText.textContent = `今日剩余对话次数：${this.usageData.remainingUsage}`;
            }
            
            if (this.progressBar) {
                const percentage = (this.usageData.remainingUsage / this.usageData.totalUsage) * 100;
                this.progressBar.style.width = `${percentage}%`;
                
                // 根据剩余次数改变进度条颜色
                if (percentage <= 20) {
                    this.progressBar.style.backgroundColor = '#dc3545';  // 红色
                } else if (percentage <= 50) {
                    this.progressBar.style.backgroundColor = '#ffc107';  // 黄色
                } else {
                    this.progressBar.style.backgroundColor = '#1f1f1f';  // 默认色
                }
            }
        } catch (error) {
            console.error('更新使用显示失败:', error);
        }
    }

    // 添加保存使用数据方法
    saveUsageData() {
        try {
            localStorage.setItem('chatUsageData', JSON.stringify(this.usageData));
        } catch (error) {
            console.error('保存使用数据失败:', error);
        }
    }

    formatAIResponse(content) {
        // 如果是第一条消息，添加问候语
        if (this.messages.length <= 1) {
            const hour = new Date().getHours();
            let greeting = '';
            
            if (hour >= 5 && hour < 12) {
                greeting = '早上好呀宝宝！';
            } else if (hour >= 12 && hour < 18) {
                greeting = '中午好呀宝宝！';
            } else {
                greeting = '晚上好呀宝宝！';
            }

            const emojis = ['(◕‿◕✿)', '(｡♥‿♥｡)', '(◠‿◠)', 'ヽ(♡‿♡)ノ'];
            return `${greeting}\n${content} ${emojis[Math.floor(Math.random() * emojis.length)]}`;
        }

        // 其他消息正常处理
        const emojis = ['(◕‿◕✿)', '(｡♥‿♥｡)', '(◠‿◠)', 'ヽ(♡‿♡)ノ'];
        return `${content} ${emojis[Math.floor(Math.random() * emojis.length)]}`;
    }

    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // 限制最大尺寸为200px
                    if (width > height) {
                        if (width > 200) {
                            height *= 200 / width;
                            width = 200;
                        }
                    } else {
                        if (height > 200) {
                            width *= 200 / height;
                            height = 200;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // 转换为base64，使用较低的质量以减小文件大小
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    initializeAvatarUpload() {
        // 创建文件输入框
        const userAvatarInput = document.createElement('input');
        userAvatarInput.type = 'file';
        userAvatarInput.accept = 'image/*';
        userAvatarInput.style.display = 'none';
        userAvatarInput.id = 'userAvatarInput';
        document.body.appendChild(userAvatarInput);

        // 为侧边栏用户头像添加点击事件
        if (this.sidebarUserAvatar) {
            this.sidebarUserAvatar.style.cursor = 'pointer';
            this.sidebarUserAvatar.title = '点击更换头像';
            this.sidebarUserAvatar.onclick = () => userAvatarInput.click();
        }

        // 处理文件选择
        userAvatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleAvatarUpload(file, 'user');
            }
            // 清空input值，允许选择相同文件
            e.target.value = '';
        };
    }

    async handleAvatarUpload(file, type) {
        try {
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                alert('请选择图片文件 (｡•́︿•̀｡)');
                return;
            }

            // 检查文件大小（2MB限制）
            if (file.size > 2 * 1024 * 1024) {
                alert('图片大小不能超过2MB (｡•́︿•̀｡)');
                return;
            }

            // 压缩并转换图片
            const compressedImage = await this.compressImage(file);
            
            // 更新头像
            this.avatars[type] = compressedImage;
            
            // 更新所有头像显示
            this.updateAllAvatars();
            
            alert('头像更新成功啦！(◕‿◕✿)');
        } catch (error) {
            console.error('头像上传失败:', error);
            alert('头像更新失败了 (｡•́︿•̀｡) 请重试');
        }
    }

    updateAllAvatars() {
        try {
            // 更新侧边栏用户头像
            if (this.sidebarUserAvatar) {
                this.sidebarUserAvatar.src = this.avatars.user;
            }

            // 更新所有聊天消息中的用户头像
            document.querySelectorAll('.user-avatar').forEach(img => {
                img.src = this.avatars.user;
            });

            // 更新所有AI头像和Logo为固定的猫咪图片
            document.querySelectorAll('.assistant-avatar').forEach(img => {
                img.src = this.avatars.assistant;
            });
            if (this.logoImage) {
                this.logoImage.src = this.avatars.assistant;
            }

            // 只保存用户头像到localStorage
            localStorage.setItem('userAvatar', this.avatars.user);
        } catch (error) {
            console.error('更新头像显示失败:', error);
        }
    }

    showActivationDialog() {
        const message = '今日对话次已用完 (｡•́︿•̀｡)\n\n' +
                       '请添加客服微信获取激码：BbyNo7s\n' +
                       '输入激活码可获额外对话次数哦～';
        
        const code = prompt(message);
        if (code) {
            this.verifyActivationCode(code);
        }
    }

    verifyActivationCode(code) {
        // 激活码库
        const validCodes = {
            '我今天很开心': 20,
            '我今天很幸福': 20,
            '我今天很幸运': 20
        };

        if (validCodes.hasOwnProperty(code)) {
            // 增加对话次数
            this.usageData.remainingUsage += validCodes[code];
            this.updateUsageDisplay();
            this.saveUsageData();
            alert(`激活成功${validCodes[code]}次额外对话机会 (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧`);
        } else {
            alert('激活码无效 (｡•́︿•｡)\n请联系客服微信：BbyNo7s 获取正确的激活码');
        }
    }

    showAvatarUploadDialog(type) {
        // 创建文件输入框
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        // 添加文件选事件
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleAvatarUpload(file, type);
            }
        };
        
        // 触发文件选择
        input.click();
    }

    initializeAccountBook() {
        try {
            // 从localStorage获取记账数据
            const savedData = localStorage.getItem('accountBook');
            this.accountBook = savedData ? JSON.parse(savedData) : {
                expenses: [],
                categories: {
                    '餐饮': { emoji: '🍜', total: 0 },
                    '交通': { emoji: '🚌', total: 0 },
                    '住房': { emoji: '🏠', total: 0 },
                    '服饰': { emoji: '👔', total: 0 },
                    '数码': { emoji: '📱', total: 0 },
                    '娱乐': { emoji: '🎮', total: 0 },
                    '学习': { emoji: '📚', total: 0 },
                    '医疗': { emoji: '💊', total: 0 },
                    '其他': { emoji: '🎁', total: 0 }
                }
            };

            // 重新计所有类别的总额
            this.recalculateCategoryTotals();
            
            // 立即更新账单面板
            this.updateAccountPanel();
        } catch (error) {
            console.error('初始化记账数据失败:', error);
            this.resetAccountBook();
        }
    }

    // 修改获取今支出统计的方法
    getDailyExpenses() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayExpenses = this.accountBook.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            expenseDate.setHours(0, 0, 0, 0);
            return expenseDate.getTime() === today.getTime();
        });

        const total = todayExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const byCategory = {};
        
        todayExpenses.forEach(expense => {
            const category = expense.category;
            byCategory[category] = (byCategory[category] || 0) + parseFloat(expense.amount);
        });

        return { total, byCategory };
    }

    // 改获取月度支出统计的方法
    getMonthlyExpenses() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const monthlyExpenses = this.accountBook.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === currentYear && 
                   expenseDate.getMonth() === currentMonth;
        });

        const total = monthlyExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const byCategory = {};
        
        monthlyExpenses.forEach(expense => {
            const category = expense.category;
            byCategory[category] = (byCategory[category] || 0) + parseFloat(expense.amount);
        });

        return { total, byCategory };
    }

    // 修改更新账单面板的方法
    updateAccountPanel() {
        if (!this.accountPanel) return;

        try {
            const dailyStats = this.getDailyExpenses();
            const monthlyStats = this.getMonthlyExpenses();
            
            // 更新总计显示
            const todayTotal = document.getElementById('todayTotal');
            const monthTotal = document.getElementById('monthTotal');
            
            if (todayTotal) todayTotal.textContent = `¥${dailyStats.total.toFixed(2)}`;
            if (monthTotal) monthTotal.textContent = `¥${monthlyStats.total.toFixed(2)}`;

            // 新分类统计
            const categoriesDiv = this.accountPanel.querySelector('.account-categories');
            if (categoriesDiv) {
                categoriesDiv.innerHTML = '';
                
                Object.entries(this.accountBook.categories)
                    .sort((a, b) => {
                        const aAmount = monthlyStats.byCategory[a[0]] || 0;
                        const bAmount = monthlyStats.byCategory[b[0]] || 0;
                        return bAmount - aAmount;
                    })
                    .forEach(([category, data]) => {
                        const amount = monthlyStats.byCategory[category] || 0;
                        const categoryItem = document.createElement('div');
                        categoryItem.className = 'category-item';
                        categoryItem.innerHTML = `
                            <div class="category-info">
                                <span class="emoji">${data.emoji}</span>
                                <span class="category-name">${category}</span>
                            </div>
                            <span class="category-amount">¥${amount.toFixed(2)}</span>
                        `;
                        categoriesDiv.appendChild(categoryItem);
                    });
            }

            // 更新最近记录
            const recordsList = this.accountPanel.querySelector('.records-list');
            if (recordsList) {
                recordsList.innerHTML = '';
                
                [...this.accountBook.expenses]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .forEach(expense => {
                        const date = new Date(expense.date);
                        const recordItem = document.createElement('div');
                        recordItem.className = 'record-item';
                        recordItem.innerHTML = `
                            <div class="record-info">
                                <div class="record-description">
                                    ${this.accountBook.categories[expense.category].emoji} ${expense.description}
                                </div>
                                <div class="record-time">
                                    ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
                                </div>
                            </div>
                            <div class="record-amount">¥${expense.amount}</div>
                        `;
                        recordsList.appendChild(recordItem);
                    });
            }
        } catch (error) {
            console.error('更新账单面板失败:', error);
        }
    }

    // 修改extractExpensesFromChat方法
    extractExpensesFromChat() {
        const expenses = [];
        const amountRegex = /(\d+(\.\d{1,2})?)(元|块|￥|¥|RMB)/g;

        // 历所有用户消息
        this.messages.forEach(msg => {
            if (msg.role === 'user') {
                const content = msg.content;
                
                // 跳过查询和统计消息
                if (content.includes('总支出') || 
                    content.includes('总') || 
                    content.includes('账单') || 
                    content.includes('统计') ||
                    content.includes('查询')) {
                    return;
                }

                let matches = content.matchAll(amountRegex);
                for (const match of matches) {
                    const amount = parseFloat(match[1]);
                    if (!isNaN(amount)) {
                        const category = this.determineCategory(content);
                        expenses.push({
                            amount: amount,
                            category: category,
                            description: content,
                            date: new Date().toISOString()
                        });
                    }
                }
            }
        });

        return expenses;
    }

    // 修改calculateDailyExpenses方法
    calculateDailyExpenses(expenses) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            expenseDate.setHours(0, 0, 0, 0);
            return expenseDate.getTime() === today.getTime();
        });

        const total = todayExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const byCategory = {};
        
        todayExpenses.forEach(expense => {
            const category = expense.category;
            byCategory[category] = (byCategory[category] || 0) + parseFloat(expense.amount);
        });

        console.log('今日支出统计:', {
            total,
            byCategory,
            expenses: todayExpenses
        });

        return { total, byCategory };
    }

    // 修改calculateMonthlyExpenses方法
    calculateMonthlyExpenses(expenses) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const monthlyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === currentYear && 
                   expenseDate.getMonth() === currentMonth;
        });

        const total = monthlyExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const byCategory = {};
        
        monthlyExpenses.forEach(expense => {
            byCategory[expense.category] = (byCategory[expense.category] || 0) + parseFloat(expense.amount);
        });

        return { total, byCategory };
    }

    // 修改updateCategoryDisplay方法
    updateCategoryDisplay(categoryTotals) {
        const categoriesDiv = this.accountPanel.querySelector('.account-categories');
        if (!categoriesDiv) return;

        categoriesDiv.innerHTML = '';
        
        Object.entries(this.accountBook.categories)
            .sort((a, b) => (categoryTotals[b[0]] || 0) - (categoryTotals[a[0]] || 0))
            .forEach(([category, data]) => {
                const amount = categoryTotals[category] || 0;
                const categoryItem = document.createElement('div');
                categoryItem.className = 'category-item';
                categoryItem.innerHTML = `
                    <div class="category-info">
                        <span class="emoji">${data.emoji}</span>
                        <span class="category-name">${category}</span>
                    </div>
                    <span class="category-amount">¥${amount.toFixed(2)}</span>
                `;
                categoriesDiv.appendChild(categoryItem);
            });
    }

    // 修改updateRecentRecords方法
    updateRecentRecords(expenses) {
        const recordsList = this.accountPanel.querySelector('.records-list');
        if (!recordsList) return;

        recordsList.innerHTML = '';
        
        [...expenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .forEach(expense => {
                const date = new Date(expense.date);
                const recordItem = document.createElement('div');
                recordItem.className = 'record-item';
                recordItem.innerHTML = `
                    <div class="record-info">
                        <div class="record-description">
                            ${this.accountBook.categories[expense.category].emoji} ${expense.description}
                        </div>
                        <div class="record-time">
                            ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
                        </div>
                    </div>
                    <div class="record-amount">¥${expense.amount.toFixed(2)}</div>
                `;
                recordsList.appendChild(recordItem);
            });
    }

    // 添加重置账本的方法
    resetAccountBook() {
        this.accountBook = {
            expenses: [],
            categories: {
                '餐饮': { emoji: '🍜', total: 0 },
                '交通': { emoji: '🚌', total: 0 },
                '住房': { emoji: '🏠', total: 0 },
                '服饰': { emoji: '👔', total: 0 },
                '数码': { emoji: '📱', total: 0 },
                '娱乐': { emoji: '🎮', total: 0 },
                '学习': { emoji: '📚', total: 0 },
                '医疗': { emoji: '💊', total: 0 },
                '其他': { emoji: '🎁', total: 0 }
            }
        };
        this.saveAccountBook();
    }

    // 保存记账数据
    saveAccountBook() {
        localStorage.setItem('accountBook', JSON.stringify(this.accountBook));
    }

    // 处理记账相关的消
    handleAccountingMessage(content) {
        // 检查是否是查询账单的请求
        const queryKeywords = ['总金额', '花费多少', '支出多少', '消费多少', '账单统计', '花了多少'];
        if (queryKeywords.some(keyword => content.includes(keyword))) {
            // 只从钱包账单中获取统计数据
            const dailyStats = this.getDailyExpenses();
            const monthlyStats = this.getMonthlyExpenses();
            
            let statsMessage = '';
            if (content.includes('今天') || content.includes('当日')) {
                statsMessage = `宝宝，让我看看钱包里今天的支出～\n\n`;
                
                if (dailyStats.total > 0) {
                    Object.entries(dailyStats.byCategory)
                        .sort((a, b) => b[1] - a[1])
                        .forEach(([category, amount]) => {
                            if (amount > 0) {
                                statsMessage += `${this.accountBook.categories[category].emoji} ${category}：¥${amount.toFixed(2)}\n`;
                            }
                        });
                    statsMessage += `\n总共花了：¥${dailyStats.total.toFixed(2)}呢～`;
                } else {
                    statsMessage += '今天还没有记录支出呢～';
                }
                
                statsMessage += '\n\n记得及时在钱包里记账哦～ (◕‿◕✿)';
            } else {
                statsMessage = `宝宝，让我看看钱包里本月的支出～\n\n`;
                
                if (monthlyStats.total > 0) {
                    Object.entries(monthlyStats.byCategory)
                        .sort((a, b) => b[1] - a[1])
                        .forEach(([category, amount]) => {
                            if (amount > 0) {
                                statsMessage += `${this.accountBook.categories[category].emoji} ${category}：¥${amount.toFixed(2)}\n`;
                            }
                        });
                    statsMessage += `\n总共花了：¥${monthlyStats.total.toFixed(2)}呢～`;
                } else {
                    statsMessage += '本月还没有记录支出呢～';
                }
                
                statsMessage += '\n\n记得及时在钱包里记账哦～ (◕‿◕✿)';
            }
            
            return {
                success: true,
                message: statsMessage
            };
        }

        // 检查是否包含金额相关内容
        const amountRegex = /(\d+(\.\d{1,2})?)(元|块|￥|¥|RMB)/i;
        if (amountRegex.test(content)) {
            // 引导用户使用钱包记账
            return {
                success: true,
                message: '宝宝要记账吗？点击右上角的钱包图标就可以记录支出啦～ (◕‿◕✿)'
            };
        }

        return false;
    }

    initializeAccountPanel() {
        // 获取记账面板元素
        this.accountPanel = document.getElementById('accountPanel');
        const showAccountBtn = document.getElementById('showAccountBtn');
        
        // 添加记账按钮和表单
        const accountHeader = this.accountPanel.querySelector('.account-header');
        
        // 添加清除账单按钮
        const clearAccountBtn = document.createElement('button');
        clearAccountBtn.className = 'clear-account-btn';
        clearAccountBtn.innerHTML = '<i class="fas fa-trash"></i> 清除账单';
        
        // 添加记一笔按钮
        const addExpenseBtn = document.createElement('button');
        addExpenseBtn.className = 'add-expense-btn';
        addExpenseBtn.innerHTML = '<i class="fas fa-plus"></i> 记一笔';
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';

        // 将按钮添加到header
        accountHeader.appendChild(addExpenseBtn);
        accountHeader.appendChild(clearAccountBtn);
        accountHeader.appendChild(closeBtn);

        // 创建记账表单（只创建一次）
        const expenseForm = document.createElement('div');
        expenseForm.className = 'expense-form';
        expenseForm.innerHTML = `
            <div class="form-header">
                <h3>记一笔</h3>
                <button class="close-form-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="form-content">
                <input type="number" 
                       id="expenseAmount" 
                       placeholder="金额" 
                       inputmode="decimal" 
                       pattern="[0-9]*"
                       step="0.01">
                <select id="expenseCategory">
                    <option value="餐饮">🍜 餐饮</option>
                    <option value="交通">🚌 交通</option>
                    <option value="住房">🏠 住房</option>
                    <option value="服饰">👔 服饰</option>
                    <option value="数码">📱 数码</option>
                    <option value="娱乐">🎮 娱乐</option>
                    <option value="学习">📚 学习</option>
                    <option value="医疗">💊 医疗</option>
                    <option value="其他">🎁 其他</option>
                </select>
                <input type="text" id="expenseDescription" placeholder="备注">
                <button id="submitExpense">确认添加</button>
            </div>
        `;
        this.accountPanel.appendChild(expenseForm);

        // 绑定事件
        if (showAccountBtn) {
            showAccountBtn.addEventListener('click', () => {
                this.showAccountPanel();
            });
        }

        closeBtn.addEventListener('click', () => {
            this.hideAccountPanel();
        });

        addExpenseBtn.addEventListener('click', () => {
            expenseForm.classList.add('show');
        });

        clearAccountBtn.addEventListener('click', () => {
            if (confirm('确定要清除所有账单记录吗？(｡•́︿•̀｡)')) {
                this.clearAccountBook();
                this.addMessage('assistant', '账单已经清空啦，让我们重新开始记账吧！(◕‿◕✿)');
            }
        });

        expenseForm.querySelector('.close-form-btn').addEventListener('click', () => {
            expenseForm.classList.remove('show');
        });

        // 获取金额输入框并添加事件监听
        const amountInput = document.getElementById('expenseAmount');
        if (amountInput) {
            // 设置数字键盘
            amountInput.addEventListener('focus', () => {
                // iOS滚动修复
                setTimeout(() => {
                    amountInput.scrollIntoViewIfNeeded();
                    window.scrollTo(0, 0);
                }, 300);
            });

            // 限制输入
            amountInput.addEventListener('input', (e) => {
                let value = e.target.value;
                value = value.replace(/[^\d.]/g, '');
                const parts = value.split('.');
                if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                }
                if (parts.length === 2 && parts[1].length > 2) {
                    value = parts[0] + '.' + parts[1].slice(0, 2);
                }
                e.target.value = value;
            });
        }

        // 绑定提交事件
        expenseForm.querySelector('#submitExpense').addEventListener('click', () => {
            const amount = amountInput.value;
            const category = document.getElementById('expenseCategory').value;
            const description = document.getElementById('expenseDescription').value || `${category}支出`;

            if (!amount || amount <= 0) {
                alert('请输入有效金额 (｡•́︿•̀｡)');
                amountInput.focus();
                return;
            }

            try {
                // 添加支出记录
                this.addExpense(parseFloat(amount), category, description);
                expenseForm.classList.remove('show');
                
                // 清空表单
                amountInput.value = '';
                document.getElementById('expenseDescription').value = '';

                // 添加小七的回复消息
                const dailyStats = this.getDailyExpenses();
                const monthlyStats = this.getMonthlyExpenses();
                
                const response = `好的宝宝，已经帮你记下这笔支出啦～\n` +
                               `${this.accountBook.categories[category].emoji} ${category}：¥${parseFloat(amount).toFixed(2)}\n\n` +
                               `今日总支出：¥${dailyStats.total.toFixed(2)}\n` +
                               `本月总支出：¥${monthlyStats.total.toFixed(2)} (◕‿◕✿)`;
                
                this.addMessage('assistant', response);
            } catch (error) {
                alert('记账失败了，请重试哦～ (｡•́︿•̀｡)');
                console.error('记账失败:', error);
            }
        });
    }

    // 优化移动端显示/隐藏面板
    showAccountPanel() {
        if (this.accountPanel) {
            this.accountPanel.classList.add('show');
            document.body.style.overflow = 'hidden'; // 防止背景滚动
            this.updateAccountPanel();
        }
    }

    hideAccountPanel() {
        if (this.accountPanel) {
            this.accountPanel.classList.remove('show');
            this.accountPanel.style.transform = '';
            document.body.style.overflow = ''; // 恢复背景滚动
        }
    }

    // 移除Logo上传功能
    initializeLogoUpload() {
        // 移除Logo的点击事件和样式
        if (this.logoImage) {
            this.logoImage.style.cursor = 'default';
            this.logoImage.onclick = null;
            this.logoImage.title = '小七宝';
        }
    }

    // 添加重新计算类别总额的方法
    recalculateCategoryTotals() {
        try {
            // 重置所有类别的总额
            Object.keys(this.accountBook.categories).forEach(category => {
                this.accountBook.categories[category].total = 0;
            });

            // 重新计算每个类别的总额
            this.accountBook.expenses.forEach(expense => {
                const category = expense.category;
                if (this.accountBook.categories[category]) {
                    this.accountBook.categories[category].total = 
                        (parseFloat(this.accountBook.categories[category].total) + 
                         parseFloat(expense.amount)).toFixed(2);
                }
            });

            // 保存更新后的数据
            this.saveAccountBook();
        } catch (error) {
            console.error('重新计算类别总额失败:', error);
            // 如果计算失败，重置账本
            this.resetAccountBook();
        }
    }

    // 修改清除账单方法
    clearAccountBook() {
        try {
            // 重置账本数据
            this.accountBook = {
                expenses: [],
                categories: {
                    '餐饮': { emoji: '🍜', total: 0 },
                    '交通': { emoji: '🚌', total: 0 },
                    '住房': { emoji: '🏠', total: 0 },
                    '服饰': { emoji: '👔', total: 0 },
                    '数码': { emoji: '📱', total: 0 },
                    '娱乐': { emoji: '🎮', total: 0 },
                    '学习': { emoji: '📚', total: 0 },
                    '医疗': { emoji: '💊', total: 0 },
                    '其他': { emoji: '🎁', total: 0 }
                }
            };

            // 保存到localStorage
            this.saveAccountBook();
            
            // 更新账单面板显示
            this.updateAccountPanel();
            
            // 添加小七的回复消息
            this.addMessage('assistant', '账单已经清空啦，让我们重新开始记账吧！(◕‿◕✿)');
            
            // 显示成功提示
            alert('账单已清除啦～开始新的记账吧！(◕‿◕✿)');
            
            console.log('账单已清除');
        } catch (error) {
            console.error('清除账单失败:', error);
            alert('清除账单失败了 (｡•́︿•̀｡) 请重试');
        }
    }

    initializeLogoAndAvatarUpload() {
        // 创建文件输入框
        const userAvatarInput = document.createElement('input');
        userAvatarInput.type = 'file';
        userAvatarInput.accept = 'image/*';
        userAvatarInput.style.display = 'none';
        userAvatarInput.id = 'userAvatarInput';

        const assistantAvatarInput = document.createElement('input');
        assistantAvatarInput.type = 'file';
        assistantAvatarInput.accept = 'image/*';
        assistantAvatarInput.style.display = 'none';
        assistantAvatarInput.id = 'assistantAvatarInput';

        document.body.appendChild(userAvatarInput);
        document.body.appendChild(assistantAvatarInput);

        // 为Logo添加点击事件
        this.logoImage = document.getElementById('logoImage');
        if (this.logoImage) {
            this.logoImage.style.cursor = 'pointer';
            this.logoImage.onclick = () => assistantAvatarInput.click();
        }

        // 为用户头像添加点击事件
        if (this.sidebarUserAvatar) {
            this.sidebarUserAvatar.style.cursor = 'pointer';
            this.sidebarUserAvatar.onclick = () => userAvatarInput.click();
        }

        // 处理文件选择
        userAvatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleAvatarUpload(file, 'user');
            }
            e.target.value = '';
        };

        assistantAvatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleAvatarUpload(file, 'assistant');
            }
            e.target.value = '';
        };
    }

    // 优化记账表单
    initializeExpenseForm() {
        const expenseForm = document.querySelector('.expense-form');
        const amountInput = document.getElementById('expenseAmount');
        
        // 自动聚焦到金额输入框
        expenseForm.addEventListener('show', () => {
            setTimeout(() => amountInput.focus(), 300);
        });

        // 添加数字键盘支持
        amountInput.setAttribute('inputmode', 'decimal');
        
        // 优化表单提交
        expenseForm.querySelector('#submitExpense').addEventListener('click', () => {
            const amount = amountInput.value;
            const category = document.getElementById('expenseCategory').value;
            const description = document.getElementById('expenseDescription').value || `${category}支出`;

            if (!amount || amount <= 0) {
                alert('请输入有效金额 (｡•́︿•̀｡)');
                return;
            }

            this.addExpense(parseFloat(amount), category, description);
            expenseForm.classList.remove('show');
            
            // 清空表单
            amountInput.value = '';
            document.getElementById('expenseDescription').value = '';
            
            // 添加小七的回复
            this.addMessage('assistant', '记账成功啦！随时问我就能帮你统计支出哦～ (◕‿◕✿)');
        });
    }
}

// API调用类
class ChatAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    }

    async sendMessage(messages) {
        try {
            const token = generateToken(this.apiKey);
            
            const systemMessage = {
                role: "system",
                content: `你是一个名叫小七宝的可爱AI助手。你性格活泼可爱，说话温柔体贴，喜欢用可爱的语气和表情。
                当用户提到金额时，你会引导用户使用钱包功能记账。
                当用户询问支出时，你会告诉用户钱包记录的支出情况。
                你会根据对话内容自然地回应，让用户感受到你的温暖和关心。
                记得在回答末尾添加可爱的颜文字。`
            };
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: document.getElementById('modelSelect').value,
                    messages: [systemMessage, ...messages],
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API调错误:', error);
            throw error;
        }
    }
}

// 添加JWT token生成函数
function generateToken(apiKey) {
    try {
        const [id, secret] = apiKey.split('.');
        
        // 创建header
        const header = {
            alg: 'HS256',
            sign_type: 'SIGN'
        };
        
        // 创建payload
        const payload = {
            api_key: id,
            exp: Date.now() + 3600000, // 1小时后过期
            timestamp: Date.now()
        };

        // Base64编码header和payload
        const encodedHeader = btoa(JSON.stringify(header));
        const encodedPayload = btoa(JSON.stringify(payload));

        // 创建签名
        const signatureInput = `${encodedHeader}.${encodedPayload}`;
        const signature = CryptoJS.HmacSHA256(signatureInput, secret).toString(CryptoJS.enc.Base64);

        // 组合token
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (error) {
        console.error('Token生成错误:', error);
        throw new Error('Token生成失败');
    }
}

// 初始化聊天界面
document.addEventListener('DOMContentLoaded', () => {
    new ChatUI();
}); 