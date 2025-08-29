// StickIt - Virtual Sticky Notes Board Application

// Note Model and Storage Manager
class Note {
    constructor(x = 100, y = 100, title = 'New Note', content = '') {
        this.id = 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
        this.title = title;
        this.content = content;
        this.x = x;
        this.y = y;
        this.width = 200;
        this.height = 150;
        this.color = '#ffeb3b';
        this.zIndex = 1;
        this.created = new Date();
        this.modified = new Date();
    }
}

class StorageManager {
    static STORAGE_KEY = 'stickit-notes';

    static saveNotes(notes) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
        } catch (error) {
            console.error('Failed to save notes to localStorage:', error);
            // Handle storage quota exceeded or other errors
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded. Please delete some notes to continue.');
            }
        }
    }

    static loadNotes() {
        try {
            const notesData = localStorage.getItem(this.STORAGE_KEY);
            if (!notesData) return [];
            
            const parsedNotes = JSON.parse(notesData);
            // Convert plain objects back to Note instances with proper dates
            return parsedNotes.map(noteData => {
                const note = Object.assign(new Note(), noteData);
                note.created = new Date(noteData.created);
                note.modified = new Date(noteData.modified);
                return note;
            });
        } catch (error) {
            console.error('Failed to load notes from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem(this.STORAGE_KEY);
            return [];
        }
    }

    static saveNote(note) {
        const notes = this.loadNotes();
        const existingIndex = notes.findIndex(n => n.id === note.id);
        
        if (existingIndex >= 0) {
            notes[existingIndex] = note;
        } else {
            notes.push(note);
        }
        
        this.saveNotes(notes);
    }

    static deleteNote(id) {
        const notes = this.loadNotes();
        const filteredNotes = notes.filter(note => note.id !== id);
        this.saveNotes(filteredNotes);
    }
}

// Note Manager - handles CRUD operations
class NoteManager {
    constructor() {
        this.notes = [];
        this.nextZIndex = 1;
    }

    createNote(x = 100, y = 100) {
        // Ensure note is positioned within viewport
        const maxX = window.innerWidth - 200;
        const maxY = window.innerHeight - 150;
        
        x = Math.max(50, Math.min(x, maxX));
        y = Math.max(100, Math.min(y, maxY)); // Account for header height
        
        const note = new Note(x, y);
        note.zIndex = this.nextZIndex++;
        
        this.notes.push(note);
        StorageManager.saveNote(note);
        
        return note;
    }

    updateNote(id, updates) {
        const note = this.notes.find(n => n.id === id);
        if (!note) return false;
        
        Object.assign(note, updates);
        note.modified = new Date();
        
        StorageManager.saveNote(note);
        return true;
    }

    deleteNote(id) {
        const index = this.notes.findIndex(n => n.id === id);
        if (index === -1) return false;
        
        this.notes.splice(index, 1);
        StorageManager.deleteNote(id);
        return true;
    }

    getAllNotes() {
        return [...this.notes];
    }

    getNote(id) {
        return this.notes.find(n => n.id === id) || null;
    }

    searchNotes(query) {
        if (!query || !query.trim()) {
            return this.getAllNotes();
        }
        
        const searchTerm = query.toLowerCase().trim();
        return this.notes.filter(note => {
            const titleMatch = note.title.toLowerCase().includes(searchTerm);
            const contentMatch = note.content.toLowerCase().includes(searchTerm);
            return titleMatch || contentMatch;
        });
    }

    loadAllNotes() {
        this.notes = StorageManager.loadNotes();
        // Update nextZIndex to be higher than any existing note
        this.nextZIndex = Math.max(1, ...this.notes.map(n => n.zIndex)) + 1;
        return this.notes;
    }
}

// Search Manager - handles search functionality
class SearchManager {
    constructor(noteManager, uiController) {
        this.noteManager = noteManager;
        this.uiController = uiController;
        this.currentQuery = '';
        this.searchResults = [];
        this.isSearchActive = false;
        this.searchTimeout = null;
    }

    searchNotes(query) {
        // Clear previous timeout to debounce search
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300); // 300ms debounce
    }

    performSearch(query) {
        this.currentQuery = query.toLowerCase().trim();
        
        if (!this.currentQuery) {
            this.clearSearch();
            return [];
        }

        this.searchResults = this.noteManager.searchNotes(this.currentQuery);
        this.displaySearchResults();
        return this.searchResults;
    }

    displaySearchResults() {
        this.isSearchActive = true;
        const allNotes = this.noteManager.getAllNotes();
        
        // Hide non-matching notes and highlight matching ones
        allNotes.forEach(note => {
            const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
            if (!noteElement) return;

            const isMatch = this.searchResults.some(result => result.id === note.id);
            
            if (isMatch) {
                noteElement.classList.remove('hidden');
                noteElement.classList.add('search-match');
                this.highlightSearchTerms(noteElement, note);
            } else {
                noteElement.classList.add('hidden');
                noteElement.classList.remove('search-match');
            }
        });

        // Show search stats
        this.showSearchStats();
        
        // Show no results message if needed
        if (this.searchResults.length === 0) {
            this.showNoResultsMessage();
        } else {
            this.hideNoResultsMessage();
        }

        // Add search-active class to body for styling
        document.body.classList.add('search-active');
    }

    highlightSearchTerms(noteElement, note) {
        const titleElement = noteElement.querySelector('.note-title');
        const contentElement = noteElement.querySelector('.note-content');

        // Store original values if not already stored
        if (!titleElement.dataset.originalValue) {
            titleElement.dataset.originalValue = note.title;
        }
        if (!contentElement.dataset.originalValue) {
            contentElement.dataset.originalValue = note.content;
        }

        // Highlight in title
        if (note.title.toLowerCase().includes(this.currentQuery)) {
            titleElement.value = note.title; // Keep original value for input
            // We'll use CSS animation instead of HTML highlighting for input fields
        }

        // Highlight in content
        if (note.content.toLowerCase().includes(this.currentQuery)) {
            contentElement.value = note.content; // Keep original value for textarea
            // We'll use CSS animation instead of HTML highlighting for textarea
        }

        // Add highlight animation
        noteElement.classList.add('search-highlight');
        setTimeout(() => {
            noteElement.classList.remove('search-highlight');
        }, 1000);
    }

    clearSearch() {
        this.currentQuery = '';
        this.searchResults = [];
        this.isSearchActive = false;

        // Clear any pending search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }

        // Show all notes and remove search styling
        const allNotes = this.noteManager.getAllNotes();
        allNotes.forEach(note => {
            const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
            if (!noteElement) return;

            noteElement.classList.remove('hidden', 'search-match', 'search-highlight');
            
            // Restore original values
            const titleElement = noteElement.querySelector('.note-title');
            const contentElement = noteElement.querySelector('.note-content');
            
            if (titleElement.dataset.originalValue) {
                titleElement.value = titleElement.dataset.originalValue;
                delete titleElement.dataset.originalValue;
            }
            if (contentElement.dataset.originalValue) {
                contentElement.value = contentElement.dataset.originalValue;
                delete contentElement.dataset.originalValue;
            }
        });

        // Hide search UI elements
        this.hideSearchStats();
        this.hideNoResultsMessage();
        document.body.classList.remove('search-active');
    }

    showSearchStats() {
        let statsElement = document.querySelector('.search-stats');
        if (!statsElement) {
            statsElement = document.createElement('div');
            statsElement.className = 'search-stats';
            this.uiController.notesBoard.appendChild(statsElement);
        }

        const totalNotes = this.noteManager.getAllNotes().length;
        const matchCount = this.searchResults.length;
        
        statsElement.textContent = `${matchCount} of ${totalNotes} notes`;
        statsElement.classList.add('visible');
    }

    hideSearchStats() {
        const statsElement = document.querySelector('.search-stats');
        if (statsElement) {
            statsElement.classList.remove('visible');
        }
    }

    showNoResultsMessage() {
        let messageElement = document.querySelector('.no-results-message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.className = 'no-results-message';
            this.uiController.notesBoard.appendChild(messageElement);
        }

        messageElement.innerHTML = `
            <div>
                <h3>No notes found</h3>
                <p>Try searching with different keywords</p>
            </div>
        `;
    }

    hideNoResultsMessage() {
        const messageElement = document.querySelector('.no-results-message');
        if (messageElement) {
            messageElement.remove();
        }
    }
}

// UI Controller - manages DOM manipulation and rendering
class UIController {
    constructor(noteManager) {
        this.noteManager = noteManager;
        this.notesBoard = document.getElementById('notesBoard');
    }

    renderNote(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note appearing';
        noteElement.dataset.noteId = note.id;
        noteElement.style.left = note.x + 'px';
        noteElement.style.top = note.y + 'px';
        noteElement.style.width = note.width + 'px';
        noteElement.style.height = note.height + 'px';
        noteElement.style.backgroundColor = note.color;
        noteElement.style.zIndex = note.zIndex;

        noteElement.innerHTML = `
            <div class="note-header">
                <input class="note-title" value="${this.escapeHtml(note.title)}" readonly>
                <div class="note-controls">
                    <button class="color-btn" title="Change Color" style="background: ${note.color}"></button>
                    <button class="delete-btn" title="Delete Note">×</button>
                </div>
            </div>
            <textarea class="note-content" readonly>${this.escapeHtml(note.content)}</textarea>
            <div class="resize-handle"></div>
        `;

        // Add event listeners for this note
        this.attachNoteEventListeners(noteElement, note);

        return noteElement;
    }

    attachNoteEventListeners(noteElement, note) {
        const titleInput = noteElement.querySelector('.note-title');
        const contentTextarea = noteElement.querySelector('.note-content');
        const deleteBtn = noteElement.querySelector('.delete-btn');
        const colorBtn = noteElement.querySelector('.color-btn');

        // Title input events
        titleInput.addEventListener('blur', () => {
            this.exitEditMode(noteElement, note);
        });

        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                contentTextarea.focus();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditMode(noteElement, note);
            }
        });

        // Content textarea events
        contentTextarea.addEventListener('blur', () => {
            this.exitEditMode(noteElement, note);
        });

        contentTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditMode(noteElement, note);
            }
        });

        // Double-click to enter edit mode
        noteElement.addEventListener('dblclick', (e) => {
            // Don't trigger edit mode if double-clicking on controls
            if (e.target.matches('.delete-btn, .color-btn, .resize-handle')) {
                return;
            }
            e.stopPropagation();
            this.enterEditMode(noteElement, note);
        });

        // Delete button event
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNoteWithConfirmation(note.id);
        });

        // Color button event
        colorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showColorPicker(noteElement, note);
        });

        // Right-click context menu for color picker
        noteElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showColorPicker(noteElement, note);
        });

        // Drag and drop functionality
        this.attachDragEventListeners(noteElement, note);
        
        // Resize functionality
        this.attachResizeEventListeners(noteElement, note);
    }

    renderAllNotes() {
        // Clear existing notes
        this.notesBoard.innerHTML = '';
        
        // Render all notes
        const notes = this.noteManager.getAllNotes();
        notes.forEach(note => {
            const noteElement = this.renderNote(note);
            this.notesBoard.appendChild(noteElement);
        });
    }

    addNoteToDOM(note) {
        const noteElement = this.renderNote(note);
        this.notesBoard.appendChild(noteElement);
        
        // Remove appearing animation class after animation completes
        setTimeout(() => {
            noteElement.classList.remove('appearing');
        }, 300);
    }

    updateNotePosition(id, x, y) {
        const noteElement = document.querySelector(`[data-note-id="${id}"]`);
        if (noteElement) {
            noteElement.style.left = x + 'px';
            noteElement.style.top = y + 'px';
        }
    }

    deleteNoteWithConfirmation(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
            if (noteElement) {
                noteElement.classList.add('disappearing');
                setTimeout(() => {
                    this.noteManager.deleteNote(noteId);
                    noteElement.remove();
                }, 300);
            }
        }
    }

    attachDragEventListeners(noteElement, note) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let startPosition = { x: 0, y: 0 };

        const handleMouseDown = (e) => {
            // Don't start drag if clicking on input elements, buttons, or resize handle
            if (e.target.matches('input, textarea, button, .resize-handle')) {
                return;
            }
            
            // Don't start drag if note is in edit mode or being resized
            if (noteElement.classList.contains('editing') || noteElement.classList.contains('resizing')) {
                return;
            }

            isDragging = true;
            startPosition = { x: note.x, y: note.y };
            
            // Calculate offset from mouse position to note's top-left corner
            const rect = noteElement.getBoundingClientRect();
            const boardRect = this.notesBoard.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            // Add visual feedback
            noteElement.classList.add('dragging');
            
            // Bring note to front
            const maxZIndex = Math.max(...this.noteManager.getAllNotes().map(n => n.zIndex));
            note.zIndex = maxZIndex + 1;
            noteElement.style.zIndex = note.zIndex;

            // Prevent text selection during drag
            e.preventDefault();
            
            // Add global mouse event listeners
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            // Calculate new position relative to the notes board
            const boardRect = this.notesBoard.getBoundingClientRect();
            let newX = e.clientX - boardRect.left - dragOffset.x;
            let newY = e.clientY - boardRect.top - dragOffset.y;

            // Constrain note within viewport boundaries
            const noteWidth = noteElement.offsetWidth;
            const noteHeight = noteElement.offsetHeight;
            const boardWidth = this.notesBoard.offsetWidth;
            const boardHeight = this.notesBoard.offsetHeight;

            newX = Math.max(0, Math.min(newX, boardWidth - noteWidth));
            newY = Math.max(0, Math.min(newY, boardHeight - noteHeight));

            // Update note position
            noteElement.style.left = newX + 'px';
            noteElement.style.top = newY + 'px';

            // Update note object (but don't save to storage yet for performance)
            note.x = newX;
            note.y = newY;
        };

        const handleMouseUp = (e) => {
            if (!isDragging) return;

            isDragging = false;
            
            // Remove visual feedback
            noteElement.classList.remove('dragging');

            // Save final position to localStorage
            this.noteManager.updateNote(note.id, { 
                x: note.x, 
                y: note.y, 
                zIndex: note.zIndex 
            });

            // Remove global event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // Attach mousedown event to the note element
        noteElement.addEventListener('mousedown', handleMouseDown);

        // Enhanced touch events for mobile support
        let touchStartTime = 0;
        let touchStartPos = { x: 0, y: 0 };
        let isLongPress = false;
        let longPressTimer = null;

        const handleTouchStart = (e) => {
            if (e.target.matches('input, textarea, button, .resize-handle')) {
                return;
            }
            
            // Don't start drag if note is in edit mode or being resized
            if (noteElement.classList.contains('editing') || noteElement.classList.contains('resizing')) {
                return;
            }

            const touch = e.touches[0];
            touchStartTime = Date.now();
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            isLongPress = false;

            // Set up long press detection for context menu (color picker)
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                // Trigger haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                this.showColorPicker(noteElement, note);
            }, 500);

            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            handleMouseDown(mouseEvent);
            e.preventDefault();
        };

        const handleTouchMove = (e) => {
            const touch = e.touches[0];
            const moveDistance = Math.sqrt(
                Math.pow(touch.clientX - touchStartPos.x, 2) + 
                Math.pow(touch.clientY - touchStartPos.y, 2)
            );

            // Cancel long press if user moves finger too much
            if (moveDistance > 10 && longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            if (!isDragging) return;
            
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            handleMouseMove(mouseEvent);
            e.preventDefault();
        };

        const handleTouchEnd = (e) => {
            // Clear long press timer
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            // Handle double tap for edit mode
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            
            if (!isDragging && !isLongPress && touchDuration < 300) {
                // Check for double tap
                const now = Date.now();
                const lastTap = noteElement.dataset.lastTap || 0;
                const timeBetweenTaps = now - lastTap;
                
                if (timeBetweenTaps < 500 && timeBetweenTaps > 50) {
                    // Double tap detected - enter edit mode
                    this.enterEditMode(noteElement, note);
                } else {
                    noteElement.dataset.lastTap = now;
                }
            }

            if (!isDragging) return;
            
            const mouseEvent = new MouseEvent('mouseup', {});
            handleMouseUp(mouseEvent);
            e.preventDefault();
        };

        // Attach touch events for mobile devices
        noteElement.addEventListener('touchstart', handleTouchStart, { passive: false });
        noteElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        noteElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    enterEditMode(noteElement, note) {
        // Store original values for potential cancellation
        noteElement.dataset.originalTitle = note.title;
        noteElement.dataset.originalContent = note.content;
        
        // Add editing class for visual feedback
        noteElement.classList.add('editing');
        
        // Make fields editable
        const titleInput = noteElement.querySelector('.note-title');
        const contentTextarea = noteElement.querySelector('.note-content');
        
        titleInput.readOnly = false;
        contentTextarea.readOnly = false;
        
        // Focus on title and select all text
        titleInput.focus();
        titleInput.select();
        
        // Add click outside listener to exit edit mode
        setTimeout(() => {
            document.addEventListener('click', this.createClickOutsideHandler(noteElement, note), { once: true });
        }, 0);
    }

    exitEditMode(noteElement, note) {
        // Remove editing class
        noteElement.classList.remove('editing');
        
        // Make fields readonly
        const titleInput = noteElement.querySelector('.note-title');
        const contentTextarea = noteElement.querySelector('.note-content');
        
        titleInput.readOnly = true;
        contentTextarea.readOnly = true;
        
        // Save changes if any
        const newTitle = titleInput.value.trim() || 'Untitled';
        const newContent = contentTextarea.value;
        
        let hasChanges = false;
        if (newTitle !== note.title) {
            note.title = newTitle;
            hasChanges = true;
        }
        if (newContent !== note.content) {
            note.content = newContent;
            hasChanges = true;
        }
        
        if (hasChanges) {
            this.noteManager.updateNote(note.id, { 
                title: note.title, 
                content: note.content 
            });
        }
        
        // Clean up stored original values
        delete noteElement.dataset.originalTitle;
        delete noteElement.dataset.originalContent;
    }

    cancelEditMode(noteElement, note) {
        // Remove editing class
        noteElement.classList.remove('editing');
        
        // Restore original values
        const titleInput = noteElement.querySelector('.note-title');
        const contentTextarea = noteElement.querySelector('.note-content');
        
        titleInput.value = noteElement.dataset.originalTitle || note.title;
        contentTextarea.value = noteElement.dataset.originalContent || note.content;
        
        // Make fields readonly
        titleInput.readOnly = true;
        contentTextarea.readOnly = true;
        
        // Clean up stored original values
        delete noteElement.dataset.originalTitle;
        delete noteElement.dataset.originalContent;
        
        // Remove focus
        titleInput.blur();
        contentTextarea.blur();
    }

    createClickOutsideHandler(noteElement, note) {
        return (e) => {
            // Check if click is outside the note
            if (!noteElement.contains(e.target)) {
                this.exitEditMode(noteElement, note);
            } else {
                // If clicked inside, set up another click outside listener
                setTimeout(() => {
                    document.addEventListener('click', this.createClickOutsideHandler(noteElement, note), { once: true });
                }, 0);
            }
        };
    }

    showColorPicker(noteElement, note) {
        // Remove any existing color picker
        const existingPicker = document.querySelector('.color-picker');
        if (existingPicker) {
            existingPicker.remove();
        }

        // Create color picker element
        const colorPicker = document.createElement('div');
        colorPicker.className = 'color-picker';
        
        // Define available colors
        const colors = [
            '#ffeb3b', // Yellow (default)
            '#ff9ff3', // Pink
            '#45b7d1', // Blue
            '#96ceb4', // Green
            '#feca57', // Orange
            '#a55eea', // Purple
            '#ff6b6b', // Red
            '#4ecdc4'  // Teal
        ];

        // Create color options
        colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.backgroundColor = color;
            colorOption.title = `Change to ${color}`;
            
            // Mark current color as selected
            if (color === note.color) {
                colorOption.classList.add('selected');
            }
            
            colorOption.addEventListener('click', (e) => {
                e.stopPropagation();
                this.changeNoteColor(noteElement, note, color);
                colorPicker.remove();
            });
            
            colorPicker.appendChild(colorOption);
        });

        // Position the color picker near the note
        const noteRect = noteElement.getBoundingClientRect();
        const boardRect = this.notesBoard.getBoundingClientRect();
        
        let pickerX = noteRect.left - boardRect.left + noteRect.width + 10;
        let pickerY = noteRect.top - boardRect.top;
        
        // Ensure color picker stays within viewport
        const pickerWidth = 120; // Width defined in CSS
        const pickerHeight = 80; // Approximate height
        
        if (pickerX + pickerWidth > boardRect.width) {
            // Position to the left of the note instead
            pickerX = noteRect.left - boardRect.left - pickerWidth - 10;
        }
        
        if (pickerY + pickerHeight > boardRect.height) {
            // Position above the note instead
            pickerY = noteRect.bottom - boardRect.top - pickerHeight;
        }
        
        // Ensure minimum positioning
        pickerX = Math.max(10, pickerX);
        pickerY = Math.max(10, pickerY);
        
        colorPicker.style.left = pickerX + 'px';
        colorPicker.style.top = pickerY + 'px';

        // Add to notes board
        this.notesBoard.appendChild(colorPicker);

        // Close picker when clicking outside
        setTimeout(() => {
            document.addEventListener('click', () => {
                colorPicker.remove();
            }, { once: true });
        }, 0);
    }

    changeNoteColor(noteElement, note, color) {
        // Update note object
        note.color = color;
        
        // Update DOM element
        noteElement.style.backgroundColor = color;
        
        // Update color button to reflect current color
        const colorBtn = noteElement.querySelector('.color-btn');
        colorBtn.style.background = color;
        
        // Save to storage
        this.noteManager.updateNote(note.id, { color: color });
    }

    attachResizeEventListeners(noteElement, note) {
        const resizeHandle = noteElement.querySelector('.resize-handle');
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        const handleMouseDown = (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(noteElement).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(noteElement).height, 10);
            
            // Prevent text selection and note dragging during resize
            e.preventDefault();
            e.stopPropagation();
            
            // Add visual feedback
            noteElement.classList.add('resizing');
            
            // Add global mouse event listeners
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            // Calculate new dimensions
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;
            
            // Enforce minimum size constraints
            const minWidth = 150;
            const minHeight = 100;
            
            newWidth = Math.max(minWidth, newWidth);
            newHeight = Math.max(minHeight, newHeight);
            
            // Ensure note doesn't go outside viewport
            const boardRect = this.notesBoard.getBoundingClientRect();
            const noteRect = noteElement.getBoundingClientRect();
            const maxWidth = boardRect.width - (noteRect.left - boardRect.left);
            const maxHeight = boardRect.height - (noteRect.top - boardRect.top);
            
            newWidth = Math.min(newWidth, maxWidth);
            newHeight = Math.min(newHeight, maxHeight);
            
            // Apply new dimensions
            noteElement.style.width = newWidth + 'px';
            noteElement.style.height = newHeight + 'px';
            
            // Update note object (but don't save to storage yet for performance)
            note.width = newWidth;
            note.height = newHeight;
        };

        const handleMouseUp = (e) => {
            if (!isResizing) return;
            
            isResizing = false;
            
            // Remove visual feedback
            noteElement.classList.remove('resizing');
            
            // Save final dimensions to localStorage
            this.noteManager.updateNote(note.id, { 
                width: note.width, 
                height: note.height 
            });
            
            // Remove global event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // Attach mousedown event to resize handle
        resizeHandle.addEventListener('mousedown', handleMouseDown);

        // Touch events for mobile support
        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            handleMouseDown(mouseEvent);
            e.preventDefault();
        };

        const handleTouchMove = (e) => {
            if (!isResizing) return;
            
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            handleMouseMove(mouseEvent);
            e.preventDefault();
        };

        const handleTouchEnd = (e) => {
            if (!isResizing) return;
            
            const mouseEvent = new MouseEvent('mouseup', {});
            handleMouseUp(mouseEvent);
            e.preventDefault();
        };

        // Attach touch events for mobile devices
        resizeHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
        resizeHandle.addEventListener('touchmove', handleTouchMove, { passive: false });
        resizeHandle.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Application initialization
class StickItApp {
    constructor() {
        this.noteManager = new NoteManager();
        this.uiController = new UIController(this.noteManager);
        this.searchManager = new SearchManager(this.noteManager, this.uiController);
        this.init();
    }

    init() {
        // Load existing notes from storage
        this.noteManager.loadAllNotes();
        this.uiController.renderAllNotes();

        // Set up event listeners
        this.setupEventListeners();
        
        console.log('StickIt application initialized');
    }

    setupEventListeners() {
        // Add Note button
        const addNoteBtn = document.getElementById('addNoteBtn');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => {
                this.createNewNote();
            });
        }

        // Search box functionality
        const searchBox = document.querySelector('.search-box');
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                const query = e.target.value;
                if (query.trim()) {
                    this.searchManager.searchNotes(query);
                } else {
                    this.searchManager.clearSearch();
                }
            });

            // Clear search on Escape key
            searchBox.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.target.value = '';
                    this.searchManager.clearSearch();
                    e.target.blur();
                }
            });

            // Add search icon and clear button functionality
            this.enhanceSearchBox(searchBox);
        }

        // Notes board click for creating notes at click position
        this.uiController.notesBoard.addEventListener('dblclick', (e) => {
            if (e.target === this.uiController.notesBoard) {
                const rect = this.uiController.notesBoard.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.createNewNote(x, y);
            }
        });
    }

    createNewNote(x, y) {
        // If no position specified, use a default position with slight offset for multiple notes
        if (x === undefined || y === undefined) {
            const existingNotes = this.noteManager.getAllNotes();
            const offset = existingNotes.length * 20;
            x = 100 + offset;
            y = 150 + offset;
        }

        const note = this.noteManager.createNote(x, y);
        this.uiController.addNoteToDOM(note);
        
        // Focus on the title input of the new note
        setTimeout(() => {
            const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
            if (noteElement) {
                const titleInput = noteElement.querySelector('.note-title');
                titleInput.readOnly = false;
                titleInput.focus();
                titleInput.select();
            }
        }, 100);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.stickItApp = new StickItApp();
});