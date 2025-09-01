document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const zipFilesInput = document.getElementById('zipFiles');
    const statusDiv = document.getElementById('status');

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the default form submission

        if (zipFilesInput.files.length === 0) {
            statusDiv.textContent = '错误：请至少选择一个 ZIP 档案。';
            statusDiv.style.color = 'red';
            return;
        }

        const formData = new FormData();
        for (const file of zipFilesInput.files) {
            formData.append('zipFiles', file);
        }

        statusDiv.textContent = '档案上传中，正在合并，请稍候...';
        statusDiv.style.color = 'black';

        try {
            const response = await fetch('/api/merge-files', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const disposition = response.headers.get('content-disposition');
                const mergeStatsHeader = response.headers.get('X-Merge-Stats-B64');
                let mergeStats = null;
                
                if (mergeStatsHeader) {
                    try {
                        const jsonStr = atob(mergeStatsHeader);
                        mergeStats = JSON.parse(jsonStr);
                    } catch (e) {
                        console.warn('Failed to parse merge stats:', e);
                    }
                }

                if (disposition && disposition.indexOf('attachment') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"])(.*?)\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    const filename = (matches != null && matches[3] ? matches[3] : 'merged-file.xml');

                    // Create download link from response data
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();

                    // Clean up the temporary link and URL after a short delay
                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 100);

                    // Display merge statistics
                    let statusHTML = `<strong>合并成功！档案 ${filename} 已开始下载。</strong><br>`;
                    
                    if (mergeStats) {
                        statusHTML += `<br><strong>合并统计：</strong><br>`;
                        statusHTML += `• 总共处理档案: ${mergeStats.totalFiles} 个<br>`;
                        statusHTML += `• 总共合并记录: ${mergeStats.totalRecords} 笔<br>`;
                        
                        if (mergeStats.fileDetails && mergeStats.fileDetails.length > 0) {
                            statusHTML += `<br><strong>档案详情：</strong><br>`;
                            mergeStats.fileDetails.forEach(file => {
                                statusHTML += `• ${file.filename}: ${file.recordCount} 笔记录<br>`;
                                
                                // Display first 5 records with detailed information
                                if (file.sampleRecords && file.sampleRecords.length > 0) {
                                    statusHTML += `  <div style="margin-left: 20px; margin-top: 5px; margin-bottom: 10px;">`;
                                    statusHTML += `  <strong>前5笔就诊资料：</strong><br>`;
                                    file.sampleRecords.forEach((record, index) => {
                                        statusHTML += `    ${index + 1}. 病患: ${record.patientId} (${record.patientName})<br>`;
                                        statusHTML += `       就诊日期: ${record.visitDate}<br>`;
                                        if (record.diagnosis) {
                                            statusHTML += `       诊断: ${record.diagnosis}<br>`;
                                        }
                                        if (record.medications && record.medications !== '无') {
                                            statusHTML += `       用药: ${record.medications}<br>`;
                                        }
                                        statusHTML += `       <br>`;
                                    });
                                    statusHTML += `  </div>`;
                                }
                            });
                        }
                    }
                    
                    statusDiv.innerHTML = statusHTML;
                    statusDiv.className = 'success';
                } else {
                    const result = await response.json();
                    statusDiv.textContent = `完成，但出现意外回应：${result.message}`;
                    statusDiv.style.color = 'orange';
                }
            } else {
                const errorResult = await response.text();
                throw new Error(errorResult || '上传或合并失败');
            }
        } catch (error) {
            statusDiv.textContent = `发生错误：${error.message}`;
            statusDiv.innerHTML = `发生错误：${error.message}`;
            statusDiv.style.color = 'red';
        }
    });

    // 多格式处理表单
    const multiFormatForm = document.getElementById('multiFormatForm');
    const multiFilesInput = document.getElementById('multiFiles');
    const multiFormatStatus = document.getElementById('multiFormatStatus');

    multiFormatForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 阻止默认表单提交

        if (multiFilesInput.files.length === 0) {
            multiFormatStatus.textContent = '错误：请至少选择一个档案。';
            multiFormatStatus.style.color = 'red';
            return;
        }

        const formData = new FormData();
        for (const file of multiFilesInput.files) {
            formData.append('multiFiles', file);
        }

        multiFormatStatus.textContent = '档案处理中，请稍候...';
        multiFormatStatus.style.color = 'black';
        multiFormatStatus.className = '';

        try {
            const response = await fetch('/api/process-multi-format', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                let statusHTML = `<strong>✅ 多格式處理成功！</strong><br>`;
                statusHTML += `<br>總共處理: <strong>${result.totalProcessed}</strong> 筆記錄<br>`;
                statusHTML += `<br><strong>處理結果:</strong><br>`;

                result.results.forEach(fileResult => {
                    if (fileResult.success) {
                        statusHTML += `✅ <strong>${fileResult.filename}</strong> (${fileResult.format}): ${fileResult.records} 筆記錄 `;
                        
                        // 添加下载按钮
                        if (fileResult.downloadUrl) {
                            statusHTML += `<a href="${fileResult.downloadUrl}" download="${fileResult.downloadFilename}" style="margin-left: 10px; padding: 2px 8px; background: #28a745; color: white; text-decoration: none; border-radius: 3px; font-size: 12px;">⬇️ 下載CSV</a>`;
                        }
                        statusHTML += `<br>`;
                        
                        // 顯示樣本數據（前10筆）
                        if (fileResult.sample && fileResult.sample.length > 0) {
                            statusHTML += `<div style="margin-left: 20px; margin-top: 5px;">`;
                            statusHTML += `<strong>📋 前10筆樣本數據:</strong><br>`;
                            statusHTML += `<div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin: 5px 0; background: #f9f9f9;">`;
                            
                            fileResult.sample.forEach((record, index) => {
                                if (Object.keys(record).length > 0) { // 檢查是否有數據
                                    statusHTML += `<div style="margin-bottom: 8px; padding: 5px; border-bottom: 1px dashed #eee;">`;
                                    statusHTML += `<strong>${index + 1}.</strong> `;
                                    
                                    // 顯示所有字段
                                    Object.entries(record).forEach(([key, value]) => {
                                        if (value && value !== '') {
                                            statusHTML += `<span style="margin-right: 10px;"><strong>${key}:</strong> ${value}</span>`;
                                        }
                                    });
                                    
                                    statusHTML += `</div>`;
                                }
                            });
                            statusHTML += `</div></div>`;
                        }
                    } else {
                        statusHTML += `❌ <strong>${fileResult.filename}</strong>: ${fileResult.error}<br>`;
                    }
                });

                multiFormatStatus.innerHTML = statusHTML;
                multiFormatStatus.className = 'success';

                // 自动更新统计数据
                setTimeout(loadStats, 1000);

            } else {
                multiFormatStatus.textContent = `處理失敗: ${result.error}`;
                multiFormatStatus.style.color = 'red';
            }

        } catch (error) {
            multiFormatStatus.textContent = `發生錯誤: ${error.message}`;
            multiFormatStatus.style.color = 'red';
        }
    });
});