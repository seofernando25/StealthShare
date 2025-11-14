<script lang="ts">
  import QrCode from "./QrCode.svelte";
  
  export type FileUploadStatus = {
    id: string;
    originalName: string;
    url: string;
    status: 'uploading' | 'completed';
    bytesUploaded: number;
    totalBytes: number;
  };

  interface Props {
    files: FileUploadStatus[];
    open: boolean;
    onClose: () => void;
    onDelete?: (id: string) => void;
  }

  let { files, open, onClose, onDelete }: Props = $props();
  let dialogEl: HTMLDialogElement | undefined;
  let contentEl: HTMLDivElement | undefined;
  let isClosing = false;

  $effect(() => {
    if (open && dialogEl && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl && dialogEl.open) {
      dialogEl.close();
    }
  });

  function handleClose() {
    if (isClosing) return;
    isClosing = true;
    
    if (dialogEl && dialogEl.open) {
      dialogEl.close();
    }
    
    onClose();
    
    // Reset flag after a brief delay
    setTimeout(() => {
      isClosing = false;
    }, 0);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      handleClose();
      return;
    }
    
    if (contentEl && event.target instanceof Node && !contentEl.contains(event.target)) {
      handleClose();
    }
  }

  function getFullUrl(path: string): string {
    if (typeof window === 'undefined') return path;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${window.location.origin}${path}`;
  }
</script>

<dialog bind:this={dialogEl} class="file-list-dialog" onclose={handleClose} onclick={handleDialogClick}>
  <div bind:this={contentEl} class="dialog-content">
    <div class="file-list-header">
      <h2 class="dialog-title">Uploaded Files</h2>
      <button class="close-button" onclick={handleClose} aria-label="Close dialog">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="file-list">
      {#if files.length === 0}
        <div class="empty-state">
          <p class="empty-text">No files uploaded yet.</p>
        </div>
      {:else}
        {#each files as file}
          <div class="file-item" class:uploading={file.status === 'uploading'}>
            {#if file.status === 'completed' && (file.url)}
              <div class="file-qr-section">
                <div class="qr-container">
                  <QrCode value={getFullUrl( file.url)} />
                </div>
              </div>
            {/if}

            <div class="file-info-section">
              <div class="file-name" title={file.originalName}>{file.originalName}</div>
              
              <div class="file-meta">
                <span class="file-status" class:uploading={file.status === 'uploading'}>
                  {#if file.status === 'uploading'}
                    <span class="status-indicator uploading"></span>
                    Uploading...
                  {:else}
                    <span class="status-indicator completed"></span>
                    Completed
                  {/if}
                </span>
                <span class="file-size">
                  {#if file.status === 'uploading'}
                    {formatBytes(file.bytesUploaded)} / {formatBytes(file.totalBytes)} 
                    ({Math.round((file.bytesUploaded / file.totalBytes) * 100)}%)
                  {:else}
                    {formatBytes(file.totalBytes)}
                  {/if}
                </span>
              </div>

              {#if file.status === 'completed' && (file.url)}
                <div class="file-actions">
                  <a 
                    href={file.url} 
                    class="file-link" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                  </a>
                  {#if onDelete}
                    <button
                      class="delete-button"
                      onclick={() => onDelete?.(file.id)}
                      aria-label="Delete file"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete
                    </button>
                  {/if}
                </div>
              {/if}
            </div>

            {#if file.status === 'uploading'}
              <div class="progress-bar-container">
                <div 
                  class="progress-bar" 
                  style="width: {(file.bytesUploaded / file.totalBytes) * 100}%"
                ></div>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</dialog>

<style>
  .file-list-dialog {
    position: fixed;
    inset: 0;
    border: none;
    background: transparent;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .dialog-content {
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 2.5rem;
    width: 90%;
    max-width: 1400px;
    height: 85vh;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
  }
  
  .file-list-dialog:not([open]) {
    display: none;
  }

  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .dialog-title {
    font-size: 2.5rem;
    font-weight: 700;
  }

  .close-button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    width: 40px;
    height: 40px;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.05);
  }
  
  .file-list {
    gap: 1.5rem;
    overflow-y: auto;
    flex: 1;
    padding-right: 0.5rem;
  }

  .file-list::-webkit-scrollbar {
    width: 8px;
  }

  .file-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .file-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  .file-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .file-item {
    position: relative;
    display: flex;
    /* This is the main layout change: from column to row */
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center; /* Vertically center QR and info */
    gap: 1.5rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  /* Style uploading items to stack info, since no QR */
  .file-item.uploading {
    flex-direction: column;
    align-items: flex-start;
  }
  
  
  /* Simplified QR section, removed the outer box styling */
  .file-qr-section {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0; /* Prevent QR from shrinking */
  }

  /* Sized down the QR and gave it a white background */
  .qr-container {
    width: 128px;
    height: 128px;
    border-radius: 8px;
    padding: 8px;
    background: white; /* Essential for scannability */
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  /* This new section holds all info to the right */
  .file-info-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1; /* Allows this section to grow */
  }
  
  /* Added overflow handling for long names */
  .file-name {
    color: white;
    font-weight: 600;
    font-size: 1.1rem;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* New wrapper for meta fields */
  .file-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .file-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #4ade80;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-indicator.uploading {
    background: #fbbf24;
    animation: pulse-dot 2s ease-in-out infinite;
  }

  .status-indicator.completed {
    background: #4ade80;
  }
  
  .file-status.uploading {
    color: #fbbf24;
  }
  
  .file-size {
    color: rgba(255, 255, 255, 0.65);
    font-size: 0.85rem;
  }
  
  .progress-bar-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0 0 12px 12px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #fbbf24, #f59e0b);
    transition: width 0.15s linear;
    border-radius: 0 0 12px 12px;
    box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
  }
  
  @keyframes pulse-dot {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(0.9);
    }
  }

  .file-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 0.5rem; /* Add some space from meta */
  }
  
  .file-link {
    color: #60a5fa;
    text-decoration: none;
    padding: 0.625rem 1.25rem;
    border: 1px solid rgba(96, 165, 250, 0.3);
    border-radius: 8px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
    flex: 1 1 auto;
    min-width: 120px;
  }
  
  .file-link:hover {
    background: rgba(96, 165, 250, 0.15);
    border-color: rgba(96, 165, 250, 0.6);
    transform: translateY(-1px);
  }
  
  .delete-button {
    color: #ef4444;
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 0.625rem 1.25rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex: 1 1 auto;
    min-width: 120px;
  }
  
  .delete-button:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.6);
    transform: translateY(-1px);
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 4rem 2rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .empty-text {
    font-size: 1.1rem;
    margin: 0;
  }

    @media (max-width: 768px) {
      .dialog-content {
        padding: 1.5rem;
        width: 95%;
        height: auto;
        max-height: calc(100vh - 2rem);
      }

      .file-list {
        padding-right: 0;
      }

      .file-list-header {
        margin-bottom: 1.25rem;
      }

      .dialog-title {
        font-size: 2rem;
      }

      .file-item {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .file-qr-section {
        width: 100%;
        justify-content: center;
      }

      .qr-container {
        width: 104px;
        height: 104px;
      }

      .file-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .file-actions {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
      }

      .file-link,
      .delete-button {
        width: 100%;
        min-width: 0;
      }
    }

    @media (max-width: 480px) {
      .dialog-content {
        padding: 1rem;
        border-radius: 12px;
      }

      .dialog-title {
        font-size: 1.5rem;
      }

      .file-item {
        padding: 1rem;
      }

      .file-name {
        font-size: 1rem;
      }
    }
</style>