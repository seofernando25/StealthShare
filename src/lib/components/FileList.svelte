<script lang="ts">
  export type FileUploadStatus = {
    id: string;
    originalName: string;
    url: string;
    downloadUrl: string;
    status: 'uploading' | 'completed';
    bytesUploaded: number;
    totalBytes: number;
  };

  interface Props {
    files: FileUploadStatus[];
    onClose: () => void;
    onDelete?: (id: string) => void;
  }

  let { files, onClose, onDelete }: Props = $props();

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
</script>

<div class="file-list-container z-100">
  <div class="file-list-header">
    <h2 class="text-4xl font-bold text-white mb-6">Uploaded Files</h2>
    <button
      class="close-button"
      onclick={onClose}
      aria-label="Close file list"
    >
      ×
    </button>
  </div>
  <div class="file-list">
    {#if files.length === 0}
      <p class="text-white/70">No files uploaded yet.</p>
    {:else}
      {#each files as file}
        <div class="file-item">
          <div class="file-info">
            <span class="file-name">{file.originalName}</span>
            <div class="file-status-row">
              <span class="file-status" class:uploading={file.status === 'uploading'}>
                {file.status === 'uploading' ? 'Uploading...' : 'Completed'}
              </span>
              {#if file.status === 'uploading'}
                <span class="file-progress-text">
                  {formatBytes(file.bytesUploaded)} / {formatBytes(file.totalBytes)} 
                  ({Math.round((file.bytesUploaded / file.totalBytes) * 100)}%)
                </span>
              {/if}
            </div>
          </div>
          {#if file.status === 'completed' && file.url}
            <div class="file-actions">
              <a href={file.url} class="file-link" target="_blank" rel="noopener noreferrer">
                Download
              </a>
              {#if onDelete}
                <button
                  class="delete-button"
                  onclick={() => onDelete?.(file.id)}
                  aria-label="Delete file"
                >
                  Delete
                </button>
              {/if}
            </div>
          {/if}
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

<style>
  .file-list-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 2rem;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 20;
    backdrop-filter: blur(10px);
  }
  
  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .close-button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .close-button:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .file-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .file-item {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    padding-bottom: 1.25rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  
  .file-item:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .file-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }
  
  .file-name {
    color: white;
    font-weight: 500;
  }
  
  .file-status-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .file-status {
    color: #4ade80;
    font-size: 0.875rem;
  }
  
  .file-status.uploading {
    color: #fbbf24;
    animation: pulse 2s ease-in-out infinite;
  }
  
  .file-progress-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
  }
  
  .progress-bar-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0 0 8px 8px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4ade80, #22c55e);
    transition: width 0.1s linear;
    border-radius: 0 0 8px 8px;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  .file-link {
    color: #60a5fa;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border: 1px solid rgba(96, 165, 250, 0.3);
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .file-link:hover {
    background: rgba(96, 165, 250, 0.1);
    border-color: rgba(96, 165, 250, 0.5);
  }
  
  .file-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .delete-button {
    color: #ef4444;
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }
  
  .delete-button:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.5);
  }
</style>

