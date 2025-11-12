<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import FileFollower from "$lib/components/FileFollower.svelte";
  import FileList from "$lib/components/FileList.svelte";
  import type { FollowerInstance } from "$lib/fileFollowerManager";
  import { createDragVisualManager } from "$lib/dragVisualManager";
  import { showFileList as showFileListStore } from "$lib/stores";

  let showTitle = $state(true);
  let fileInputEl: HTMLInputElement | undefined;
  let followerEntries = $state<Array<[string, FollowerInstance]>>([]);
  let hasActiveFollowers = $state(false);
  let showFileList = $state(false);
  
  // Sync local state with store
  $effect(() => {
    showFileListStore.set(showFileList);
  });
  
  type FileUploadStatus = {
    id: string;
    originalName: string;
    url: string;
    downloadUrl: string;
    status: 'uploading' | 'completed';
    bytesUploaded: number;
    totalBytes: number;
  };
  
  let uploadedFiles = $state<FileUploadStatus[]>([]);
  
  let blackHoleRadius = $state(0);
  
  function calculateBlackHoleSize() {
    if (typeof window === 'undefined') return;
    
    const fov = 75; // degrees, matches PerspectiveCamera fov
    const distance = 1.5; // camera.position.z
    const vFovRad = (fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFovRad / 2) * distance;
    
    const normalizedRadius = 0.475;
    blackHoleRadius = (window.innerHeight / visibleHeight) * normalizedRadius;
  }
  
  $effect(() => {
    if (typeof window === 'undefined') return;
    calculateBlackHoleSize();
    
    const handleResize = () => {
      calculateBlackHoleSize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  const dragVisual = createDragVisualManager();

  const unsubscribeActiveFollowers = dragVisual.activeFollowers.subscribe((map) => {
    followerEntries = Array.from(map.entries());
  });

  $effect(() => {
    hasActiveFollowers = followerEntries.length > 0;
  });

  $effect(() => {
    followerEntries.forEach(([id, instance]) => {
      if (instance.component && instance.component.api) {
        dragVisual.registerComponent(id, instance.component);
      }
    });
  });

  const processFiles = (files: FileList, skipAnimation = false) => {
    if (typeof window === 'undefined') return;

    showTitle = false;
    // Handle the dropped files here
    console.log('Files dropped:', files);
  };

  const handleFileProcessing = async (files: FileList) => {
    // Process files immediately when dropped or selected
    console.log('Processing files:', files);
    
    const fileArray = Array.from(files);
    
    // Add files to upload list with uploading status
    const newUploads: FileUploadStatus[] = fileArray.map((file) => ({
      id: 'temp-' + Date.now() + '-' + Math.random(),
      originalName: file.name,
      url: '',
      downloadUrl: '',
      status: 'uploading' as const,
      bytesUploaded: 0,
      totalBytes: file.size
    }));
    uploadedFiles = [...uploadedFiles, ...newUploads];

    // Upload each file individually to track progress per file
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const uploadEntry = newUploads[i];
      
      await uploadFileWithProgress(file, uploadEntry);
    }
  };

  const uploadFileWithProgress = (file: File, uploadEntry: FileUploadStatus): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const bytesUploaded = event.loaded;
          const totalBytes = event.total;
          
          // Update the specific file's progress - match by ID or filename
          uploadedFiles = uploadedFiles.map((f) => {
            if (f.id === uploadEntry.id || (f.originalName === file.name && f.status === 'uploading')) {
              return {
                ...f,
                bytesUploaded: bytesUploaded,
                totalBytes: totalBytes
              };
            }
            return f;
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            // Server now always returns files array
            const completedFile = result.files?.[0];
            
            if (!completedFile) {
              throw new Error('Server response missing file data');
            }
            
            // Update upload status to completed
            // Match by ID first, then fallback to filename to ensure we find the right file
            uploadedFiles = uploadedFiles.map((f) => {
              const matchesById = f.id === uploadEntry.id;
              const matchesByName = f.originalName === file.name && f.status === 'uploading';
              
              if (matchesById || matchesByName) {
                return {
                  id: completedFile.id,
                  originalName: completedFile.originalName || file.name,
                  url: completedFile.url,
                  downloadUrl: completedFile.downloadUrl,
                  status: 'completed' as const,
                  bytesUploaded: f.totalBytes,
                  totalBytes: f.totalBytes,
                  uploadComplete: true
                };
              }
              return f;
            });
            resolve();
          } catch (error) {
            console.error('Failed to parse response:', error);
            // Remove failed upload - match by ID or filename
            uploadedFiles = uploadedFiles.filter(f => 
              f.id !== uploadEntry.id && !(f.originalName === file.name && f.status === 'uploading')
            );
            reject(error);
          }
        } else {
          // Remove failed upload - match by ID or filename
          uploadedFiles = uploadedFiles.filter(f => 
            f.id !== uploadEntry.id && !(f.originalName === file.name && f.status === 'uploading')
          );
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        console.error('Upload error:', xhr.statusText);
        // Remove failed upload - match by ID or filename
        uploadedFiles = uploadedFiles.filter(f => 
          f.id !== uploadEntry.id && !(f.originalName === file.name && f.status === 'uploading')
        );
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        // Remove aborted upload - match by ID or filename
        uploadedFiles = uploadedFiles.filter(f => 
          f.id !== uploadEntry.id && !(f.originalName === file.name && f.status === 'uploading')
        );
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', '/u');
      xhr.send(formData);
    });
  };

  const handleDragEnter = (event: DragEvent) => {
    if (showFileList) return;
    dragVisual.handleDragEnter(event);
  };

  const handleDragLeave = (event: DragEvent) => {
    if (showFileList) return;
    dragVisual.handleDragLeave(event);
  };

  const handleDragOver = (event: DragEvent) => {
    if (showFileList) return;
    dragVisual.handleDragOver(event);
  };

  const handleDrop = async (event: DragEvent) => {
    if (showFileList) return;
    console.log("drop event", event)
    console.log("drop", event) // this runs before the animation finishes
    const files = await dragVisual.handleDrop(event); // This now returns immediately
    // files are processed immediately, animation continues in background
    if (files && files.length > 0) {
      processFiles(files, true);
      handleFileProcessing(files);
    }
  };

  const simulateSelectionAnimation = async (startX: number, startY: number, count: number) => {
    await dragVisual.simulateSelectionAnimation(startX, startY, count);
  };

  let clickPosition = { x: 0, y: 0 };

  const handleClick = (event: MouseEvent | KeyboardEvent) => {
    if (typeof window === 'undefined' || !fileInputEl || showFileList) return;
    
    // Store click position for animation (use center for keyboard events)
    if (event instanceof MouseEvent) {
      clickPosition.x = event.clientX;
      clickPosition.y = event.clientY;
    } else {
      clickPosition.x = window.innerWidth / 2;
      clickPosition.y = window.innerHeight / 2;
    }
    
    // Open file picker
    fileInputEl.click();
  };
  
  const handleBlackHoleClick = (event: MouseEvent | KeyboardEvent) => {
    if (showTitle || showFileList) return;
    
    if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    
    // For keyboard events, assume center click
    // For mouse events, check if click is within the circle bounds
    if (event instanceof MouseEvent) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const distance = Math.sqrt(
        Math.pow(event.clientX - centerX, 2) + 
        Math.pow(event.clientY - centerY, 2)
      );
      
      if (distance > blackHoleRadius) {
        return;
      }
    }
    
    event.stopPropagation();
    event.preventDefault();
    showFileList = true;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    }
  };

  const handleFileSelect = (event: Event) => {
    if (showFileList) return;
    
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (!files || files.length === 0) {
      return;
    }

    // Use stored click position (or center as fallback)
    const startX = clickPosition.x || window.innerWidth / 2;
    const startY = clickPosition.y || window.innerHeight / 2;

    console.log("files event", event) // this runs before animation 

    simulateSelectionAnimation(startX, startY, files.length);
    processFiles(files, true);
    handleFileProcessing(files);
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/d/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the file from the list
        uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
      } else {
        console.error('Failed to delete file:', response.statusText);
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      // Optionally show an error message to the user
    }
  };

  onMount(() => {
    if (typeof window === 'undefined') return;
    
    window.addEventListener("dragenter", handleDragEnter, true);
    window.addEventListener("dragleave", handleDragLeave, true);
    window.addEventListener("dragover", handleDragOver, true);
    window.addEventListener("drop", handleDrop, true);
  });

  onDestroy(() => {
    unsubscribeActiveFollowers();
    if (typeof window === 'undefined') return;

    window.removeEventListener("dragenter", handleDragEnter, true);
    window.removeEventListener("dragleave", handleDragLeave, true);
    window.removeEventListener("dragover", handleDragOver, true);
    window.removeEventListener("drop", handleDrop, true);
    
    dragVisual.cleanup();
  });
</script>

<div 
  class="fixed inset-0 flex items-center justify-center transition-opacity duration-500"
  class:cursor-pointer={!showFileList}
  class:opacity-0={showFileList}
  onclick={handleClick}
  role="button"
  tabindex="0"
  onkeydown={handleKeyDown}
>
  <h1
    class="text-6xl font-bold text-white transition-opacity duration-300 ease-out pointer-events-none drop-shadow"
    class:opacity-0={hasActiveFollowers || !showTitle}
    style="text-shadow: 0 4px 32px rgba(0,0,0,0.85);"
  >
    StealthShare
  </h1>
</div>

<!-- Hidden file input -->
<input
  bind:this={fileInputEl}
  type="file"
  multiple
  class="hidden"
  onchange={handleFileSelect}
/>

<!-- Black Hole Overlay -->
{#if !showTitle}
  <div
    class="black-hole-overlay opacity-0"
    style="width: {blackHoleRadius * 2}px; height: {blackHoleRadius * 2}px; border-radius: 50%;"
    onclick={handleBlackHoleClick}
    onkeydown={handleBlackHoleClick}
    role="button"
    tabindex="0"
  ></div>
{/if}

<!-- File List View -->
{#if showFileList}
  <FileList 
    files={uploadedFiles} 
    onClose={() => showFileList = false}
    onDelete={handleDeleteFile}
  />
{/if}

<!-- File Followers -->
{#each followerEntries as [id, instance]}
  {#key id}
    <FileFollower
      id={id}
      initialX={instance.x}
      initialY={instance.y}
      bind:this={instance.component}
    />
  {/key}
{/each}

<style>
  .black-hole-overlay {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(255, 0, 0, 0.1);
    border: 2px solid rgba(255, 0, 0, 0.5);
    cursor: pointer;
    z-index: 5;
    transition: all 0.3s ease;
  }
  
  .black-hole-overlay:hover {
    background-color: rgba(255, 0, 0, 0.2);
    border-color: rgba(255, 0, 0, 0.8);
  }
</style>
