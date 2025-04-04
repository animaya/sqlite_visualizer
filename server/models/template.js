/**
 * Template Model
 * 
 * Represents an insight template in the application for visualizing data.
 * Templates provide pre-configured visualization settings that users can apply
 * to their database tables with minimal configuration.
 */

/**
 * Template schema:
 * {
 *   id: number,          // Unique identifier for the template
 *   name: string,        // Display name of the template
 *   description: string, // Optional description of what the template visualizes
 *   type: string,        // Chart type (bar, line, pie, doughnut, etc.)
 *   config: JSON string, // Configuration including mappings and display settings
 *   category: string,    // Category for grouping/filtering templates (sales, performance, etc.)
 *   is_default: boolean  // Whether this is a built-in template
 * }
 */

const appDbService = require('../services/appDbService');

/**
 * Create a new template record
 * @param {Object} templateData - Template details
 * @param {string} templateData.name - Display name of the template
 * @param {string} [templateData.description] - Description of what the template visualizes
 * @param {string} templateData.type - Chart type (bar, line, pie, doughnut, etc.)
 * @param {Object|string} templateData.config - Configuration object or JSON string
 * @param {string} [templateData.category] - Category for grouping templates
 * @param {boolean} [templateData.is_default=false] - Whether this is a built-in template
 * @returns {Promise<Object>} Created template with ID
 * @throws {Error} If required fields are missing or database operation fails
 */
async function create(templateData) {
  try {
    // Validate required fields
    const { name, type, config } = templateData;
    if (!name || typeof name !== 'string') {
      throw new Error('Template name is required and must be a string');
    }
    if (!type || typeof type !== 'string') {
      throw new Error('Template type is required and must be a string');
    }
    if (!config) {
      throw new Error('Template config is required');
    }
    
    // Convert config object to JSON string if it's not already a string
    const configStr = typeof config === 'object' ? JSON.stringify(config) : config;
    
    // Ensure is_default is properly converted to SQLite boolean (0/1)
    const isDefault = templateData.is_default ? 1 : 0;
    
    // Execute the insert
    const result = await appDbService.run(`
      INSERT INTO insight_templates (
        name, description, type, config, category, is_default
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name,
      templateData.description || null,
      type,
      configStr,
      templateData.category || null,
      isDefault
    ]);
    
    // Return the created template with ID
    return {
      id: result.lastID,
      ...templateData,
      config: typeof config === 'string' ? config : configStr,
      is_default: Boolean(isDefault)
    };
  } catch (error) {
    console.error('Failed to create template:', error);
    throw error;
  }
}

/**
 * Find a template by ID
 * @param {number|string} id - Template ID
 * @returns {Promise<Object|null>} Template object or null if not found
 * @throws {Error} If database operation fails
 */
async function findById(id) {
  try {
    // Validate ID
    if (!id) {
      throw new Error('Template ID is required');
    }
    
    const template = await appDbService.get(`
      SELECT id, name, description, type, config, category, is_default
      FROM insight_templates
      WHERE id = ?
    `, [id]);
    
    if (!template) {
      return null;
    }
    
    // Parse the config JSON string to object
    try {
      template.config = JSON.parse(template.config);
    } catch (e) {
      console.warn(`Failed to parse template config for template ${id}. Using raw string.`);
    }
    
    // Convert SQLite integer boolean to JavaScript boolean
    template.is_default = Boolean(template.is_default);
    
    return template;
  } catch (error) {
    console.error(`Failed to find template with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Find all templates with optional filtering
 * @param {Object} filters - Optional filters
 * @param {string} [filters.category] - Filter by category
 * @param {string} [filters.type] - Filter by chart type
 * @param {boolean} [filters.isDefault] - Filter by default status
 * @param {string} [filters.search] - Search in name and description
 * @returns {Promise<Array>} Array of template objects
 * @throws {Error} If database operation fails
 */
async function findAll(filters = {}) {
  try {
    let query = `
      SELECT id, name, description, type, config, category, is_default
      FROM insight_templates
    `;
    
    const whereConditions = [];
    const params = [];
    
    // Apply filters if provided
    if (filters.category) {
      whereConditions.push('category = ?');
      params.push(filters.category);
    }
    
    if (filters.type) {
      whereConditions.push('type = ?');
      params.push(filters.type);
    }
    
    if (filters.isDefault !== undefined) {
      whereConditions.push('is_default = ?');
      params.push(filters.isDefault ? 1 : 0);
    }
    
    // Add text search if provided
    if (filters.search) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add ordering
    query += ' ORDER BY name ASC';
    
    const templates = await appDbService.all(query, params);
    
    // Process results
    return templates.map(template => {
      if (!template) return null;
      
      // Parse config JSON strings to objects
      if (template.config) {
        try {
          template.config = JSON.parse(template.config);
        } catch (e) {
          console.warn(`Failed to parse template config for template ${template.id}. Using raw string.`);
        }
      }
      
      // Convert SQLite integer boolean to JavaScript boolean
      template.is_default = Boolean(template.is_default);
      
      return template;
    }).filter(Boolean); // Filter out any null values
  } catch (error) {
    console.error('Failed to find templates:', error);
    throw error;
  }
}

/**
 * Update a template
 * @param {number|string} id - Template ID
 * @param {Object} templateData - Updated template details
 * @param {string} [templateData.name] - Display name of the template
 * @param {string} [templateData.description] - Description of what the template visualizes
 * @param {string} [templateData.type] - Chart type (bar, line, pie, doughnut, etc.)
 * @param {Object|string} [templateData.config] - Configuration object or JSON string
 * @param {string} [templateData.category] - Category for grouping templates
 * @param {boolean} [templateData.is_default] - Whether this is a built-in template
 * @returns {Promise<Object|null>} Updated template or null if not found
 * @throws {Error} If database operation fails
 */
async function update(id, templateData) {
  try {
    // Validate ID
    if (!id) {
      throw new Error('Template ID is required');
    }
    
    // First check if the template exists
    const existing = await findById(id);
    if (!existing) {
      return null;
    }
    
    // Prepare update fields
    const updates = [];
    const params = [];
    
    if (templateData.name !== undefined) {
      if (typeof templateData.name !== 'string' || !templateData.name.trim()) {
        throw new Error('Template name must be a non-empty string');
      }
      updates.push('name = ?');
      params.push(templateData.name);
    }
    
    if (templateData.description !== undefined) {
      updates.push('description = ?');
      params.push(templateData.description);
    }
    
    if (templateData.type !== undefined) {
      if (typeof templateData.type !== 'string' || !templateData.type.trim()) {
        throw new Error('Template type must be a non-empty string');
      }
      updates.push('type = ?');
      params.push(templateData.type);
    }
    
    if (templateData.config !== undefined) {
      if (!templateData.config) {
        throw new Error('Template config cannot be empty');
      }
      updates.push('config = ?');
      const configStr = typeof templateData.config === 'object' 
        ? JSON.stringify(templateData.config) 
        : templateData.config;
      params.push(configStr);
    }
    
    if (templateData.category !== undefined) {
      updates.push('category = ?');
      params.push(templateData.category);
    }
    
    if (templateData.is_default !== undefined) {
      updates.push('is_default = ?');
      params.push(templateData.is_default ? 1 : 0);
    }
    
    // If nothing to update, return existing template
    if (updates.length === 0) {
      return existing;
    }
    
    // Add ID to params
    params.push(id);
    
    // Execute update
    const result = await appDbService.run(`
      UPDATE insight_templates
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);
    
    if (result.changes === 0) {
      return null;
    }
    
    // Return updated template
    return await findById(id);
  } catch (error) {
    console.error(`Failed to update template ${id}:`, error);
    throw error;
  }
}

/**
 * Remove a template
 * @param {number|string} id - Template ID
 * @returns {Promise<boolean>} True if template was removed, false if not found
 * @throws {Error} If database operation fails
 */
async function remove(id) {
  try {
    // Validate ID
    if (!id) {
      throw new Error('Template ID is required');
    }
    
    const result = await appDbService.run('DELETE FROM insight_templates WHERE id = ?', [id]);
    
    return result.changes > 0;
  } catch (error) {
    console.error(`Failed to remove template ${id}:`, error);
    throw error;
  }
}

module.exports = {
  create,
  findById,
  findAll,
  update,
  remove
};
