/**
 * Template Service
 * 
 * Handles insight template management and application
 */

const appDbService = require('./appDbService');
const databaseService = require('./databaseService');
const templateModel = require('../models/template');

/**
 * Get all insight templates
 * @param {Object} filters - Optional filters to apply
 * @returns {Promise<Array>} - Array of templates
 */
async function getAllTemplates(filters = {}) {
  try {
    return await templateModel.findAll(filters);
  } catch (error) {
    console.error('Failed to get all templates:', error);
    throw error;
  }
}

/**
 * Get a template by ID
 * @param {string} id - Template ID
 * @returns {Promise<Object|null>} - Template object or null if not found
 */
async function getTemplateById(id) {
  try {
    const template = await templateModel.findById(id);
    return template;
  } catch (error) {
    console.error(`Failed to get template ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new template
 * @param {Object} templateData - Template details
 * @returns {Promise<Object>} - Created template
 */
async function createTemplate(templateData) {
  try {
    return await templateModel.create(templateData);
  } catch (error) {
    console.error('Failed to create template:', error);
    throw error;
  }
}

/**
 * Update an existing template
 * @param {string} id - Template ID
 * @param {Object} templateData - Updated template details
 * @returns {Promise<Object|null>} - Updated template or null if not found
 */
async function updateTemplate(id, templateData) {
  try {
    return await templateModel.update(id, templateData);
  } catch (error) {
    console.error(`Failed to update template ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a template
 * @param {string} id - Template ID
 * @returns {Promise<boolean>} - True if deleted, false if not found
 */
async function deleteTemplate(id) {
  try {
    return await templateModel.remove(id);
  } catch (error) {
    console.error(`Failed to delete template ${id}:`, error);
    throw error;
  }
}

/**
 * Apply a template to data
 * @param {string} templateId - Template ID
 * @param {string} connectionId - Connection ID
 * @param {Array|string} tableNames - Table names to use (can be single string or array)
 * @param {Object} mappings - Field mappings for template
 * @returns {Promise<Object>} - Visualization data and config
 */
async function applyTemplate(templateId, connectionId, tableNames, mappings) {
  try {
    // Get the template
    const template = await getTemplateById(templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    
    // Normalize tableNames to array
    const tables = Array.isArray(tableNames) ? tableNames : [tableNames];
    
    if (tables.length === 0) {
      throw new Error('At least one table name must be provided');
    }
    
    // Get template config
    const templateConfig = template.config;
    
    // Merge user mappings with template config
    const mergedConfig = {
      ...templateConfig,
      mappings: {
        ...templateConfig.mappings,
        ...mappings
      }
    };
    
=======
    // Generate data based on template type and config
    let data;
    
    try {
      // Different query logic based on chart type
      switch (template.type.toLowerCase()) {
        case 'bar':
        case 'line':
          // For bar and line charts, we need to fetch data for the x and y axes
          data = await generateChartData(connectionId, tables[0], mergedConfig);
          break;
          
        case 'pie':
        case 'doughnut':
          // For pie/doughnut charts, we need labels and values
          data = await generatePieChartData(connectionId, tables[0], mergedConfig);
          break;
          
        default:
          throw new Error(`Unsupported chart type: ${template.type}`);
      }
    } catch (error) {
      console.error(`Error generating chart data for template ${templateId}:`, error);
      throw new Error(`Failed to generate visualization data: ${error.message}`);
    }
    
    return {
      data,
      config: mergedConfig,
      type: template.type
    };
  } catch (error) {
    console.error(`Failed to apply template ${templateId}:`, error);
    throw error;
  }
}

=======
/**
 * Generate data for bar or line charts
 * @param {string} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @param {Object} config - Chart configuration
 * @returns {Promise<Object>} - Chart data
 */
async function generateChartData(connectionId, tableName, config) {
  try {
    // Get mappings
    const { x, y, sort, limit = 10, groupBy } = config.mappings;
    
    if (!x || !y) {
      throw new Error('X and Y axis mappings are required');
    }
    
    // Validate that the table exists
    const tables = await databaseService.getAllTables(connectionId);
    if (!tables.some(t => t.name === tableName)) {
      throw new Error(`Table "${tableName}" not found in the database`);
    }
    
    // Validate that the columns exist in the table
    const schema = await databaseService.getTableSchema(connectionId, tableName);
    const columnNames = schema.columns.map(c => c.name);
    
    if (!columnNames.includes(x)) {
      throw new Error(`Column "${x}" not found in table "${tableName}"`);
    }
    
    if (!columnNames.includes(y)) {
      throw new Error(`Column "${y}" not found in table "${tableName}"`);
    }
    
    if (groupBy && !columnNames.includes(groupBy)) {
      throw new Error(`Group by column "${groupBy}" not found in table "${tableName}"`);
    }
    
    // Build query options
    const options = {
      columns: [x, y],
      limit: parseInt(limit) || 10
    };
    
    // Add sorting if specified
    if (sort) {
      options.sort = {
        column: y,
        direction: sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC'
      };
    } else {
      // Default sorting for better visualization
      options.sort = {
        column: y,
        direction: 'DESC'
      };
    }
    
    // Add grouping if specified
    if (groupBy) {
      options.groupBy = groupBy;
    } else {
      // If no groupBy is specified but we're visualizing data,
      // we need to group by the x-axis to avoid duplicate entries
      options.groupBy = x;
    }
    
    // Execute query to get data
    const result = await databaseService.getAggregatedData(
      connectionId,
      tableName,
      options
    );
    
    if (!result.data || result.data.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: config.title || y,
          data: [],
          backgroundColor: [],
          borderColor: '#2563EB',
          borderWidth: 1
        }]
      };
    }
    
    // Format data for Chart.js
    const labels = result.data.map(row => row[x]?.toString() || 'Unknown');
    const values = result.data.map(row => parseFloat(row[y]) || 0);
    
    return {
      labels,
      datasets: [{
        label: config.title || y,
        data: values,
        backgroundColor: generateChartColors(values.length),
        borderColor: '#2563EB',
        borderWidth: 1
      }]
    };
  } catch (error) {
    console.error('Failed to generate chart data:', error);
    throw error;
  }
}

=======
/**
 * Generate data for pie or doughnut charts
 * @param {string} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @param {Object} config - Chart configuration
 * @returns {Promise<Object>} - Chart data
 */
async function generatePieChartData(connectionId, tableName, config) {
  try {
    // Get mappings
    const { labels: labelField, values: valueField, limit = 10 } = config.mappings;
    
    if (!labelField || !valueField) {
      throw new Error('Labels and values mappings are required');
    }
    
    // Validate that the table exists
    const tables = await databaseService.getAllTables(connectionId);
    if (!tables.some(t => t.name === tableName)) {
      throw new Error(`Table "${tableName}" not found in the database`);
    }
    
    // Validate that the columns exist in the table
    const schema = await databaseService.getTableSchema(connectionId, tableName);
    const columnNames = schema.columns.map(c => c.name);
    
    if (!columnNames.includes(labelField)) {
      throw new Error(`Label column "${labelField}" not found in table "${tableName}"`);
    }
    
    if (!columnNames.includes(valueField)) {
      throw new Error(`Value column "${valueField}" not found in table "${tableName}"`);
    }
    
    // Build query options
    const options = {
      columns: [labelField, valueField],
      limit: parseInt(limit) || 10,
      sort: {
        column: valueField,
        direction: 'DESC'
      },
      // Group by the label field to avoid duplicate entries
      groupBy: labelField
    };
    
    // Execute query to get data
    const result = await databaseService.getAggregatedData(
      connectionId,
      tableName,
      options
    );
    
    if (!result.data || result.data.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: []
        }]
      };
    }
    
    // Format data for Chart.js
    const labels = result.data.map(row => row[labelField]?.toString() || 'Unknown');
    const values = result.data.map(row => parseFloat(row[valueField]) || 0);
    
    // Generate colors for the pie segments
    const colors = generateChartColors(values.length);
    
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: colors.map(() => '#FFFFFF'),
        borderWidth: 1
      }]
    };
  } catch (error) {
    console.error('Failed to generate pie chart data:', error);
    throw error;
  }
}

/**
 * Get template field requirements
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} - Template field requirements
 */
async function getTemplateRequirements(templateId) {
  try {
    const template = await getTemplateById(templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    
    // Different requirements based on chart type
    const requiredFields = [];
    const optionalFields = [];
    
    switch (template.type.toLowerCase()) {
      case 'bar':
      case 'line':
        requiredFields.push({ name: 'x', label: 'X-Axis (Categories)' });
        requiredFields.push({ name: 'y', label: 'Y-Axis (Values)' });
        optionalFields.push({ name: 'groupBy', label: 'Group By' });
        optionalFields.push({ name: 'sort', label: 'Sort Direction' });
        optionalFields.push({ name: 'limit', label: 'Result Limit' });
        break;
        
      case 'pie':
      case 'doughnut':
        requiredFields.push({ name: 'labels', label: 'Labels (Categories)' });
        requiredFields.push({ name: 'values', label: 'Values (Sizes)' });
        optionalFields.push({ name: 'limit', label: 'Result Limit' });
        break;
        
      default:
        throw new Error(`Unsupported chart type: ${template.type}`);
    }
    
    return {
      requiredFields,
      optionalFields,
      templateInfo: {
        name: template.name,
        description: template.description,
        type: template.type,
        category: template.category
      }
    };
  } catch (error) {
    console.error(`Failed to get template requirements for ${templateId}:`, error);
    throw error;
  }
}

/**
 * Get all available template categories
 * @returns {Promise<Array>} - Array of unique category names
 */
async function getTemplateCategories() {
  try {
    const templates = await getAllTemplates();
    
    // Extract unique categories
    const categories = [...new Set(templates
      .map(template => template.category)
      .filter(Boolean)
    )];
    
    return categories;
  } catch (error) {
    console.error('Failed to get template categories:', error);
    throw error;
  }
}

/**
 * Generate an array of chart colors
 * @param {number} count - Number of colors needed
 * @returns {Array<string>} - Array of color hex codes
 */
function generateChartColors(count) {
  // Define a set of base colors that match the style guide
  const baseColors = [
    '#2563EB', // blue-600
    '#D946EF', // fuchsia-500
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#6366F1', // indigo-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#84CC16'  // lime-500
  ];
  
  // If we need more colors than we have, cycle through them
  const colors = [];
  for (let i = 0; i < count; i++) {
    const baseColor = baseColors[i % baseColors.length];
    colors.push(baseColor);
  }
  
  return colors;
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
  getTemplateRequirements,
  getTemplateCategories
};
