import React, { useCallback } from 'react'; // Import useCallback
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete'; // <-- UNCOMMENTED THIS IMPORT
import axios from 'axios';
// Removed useTheme, useMediaQuery as they are no longer needed for column filtering


// Make onDelete and apiEndpoint optional in the props
const DataTable = ({ data = [], columns = [], rowKey, onDelete, apiEndpoint }) => {

  // Check if delete functionality should be active
  // Ensure deleteColumn has an ID that matches one in columns array
  const deleteColumn = columns.find(col => col.id === 'delete');
  const enableDelete = !!(deleteColumn && onDelete && apiEndpoint && rowKey);

  // --- REMOVED CONDITIONAL COLUMN FILTERING ---
  // const theme = useTheme();
  // const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  // const visibleColumns = isXs
  //   ? columns.filter(col => /* ... filtering logic ... */)
  //   : columns;
  // --- END REMOVED ---

  // Now, visibleColumns is always the full columns array passed in
  const visibleColumns = columns;


  const handleDelete = useCallback(async (id) => { // Wrapped in useCallback
    // Double check if deletion is enabled and we have an ID
    if (!enableDelete || !id) {
      console.warn("Delete cancelled: Delete functionality not fully configured or ID missing.");
      return;
    }

    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        // Assuming the API endpoint is base URL + apiEndpoint + /id
        const deleteUrl = `http://localhost:3001/${apiEndpoint}/${id}`; // <-- Adjusted URL based on typical structure and console.log in Ledger.jsx
        console.log(`Attempting DELETE: ${deleteUrl}`);
        await axios.delete(deleteUrl);
        onDelete(id); // Call the parent's delete handler
        console.log("Delete successful for ID:", id); // Success log
      } catch (error) {
        console.error('Error deleting item:', error);
        // Provide more specific feedback if possible
        const errorMsg = error.response?.data?.message || 'Failed to delete item. Please check server logs.';
        alert(`Delete failed: ${errorMsg}`);
      }
    }
  }, [enableDelete, onDelete, apiEndpoint]); // Added dependencies


  // Ensure data is an array before mapping
  const tableData = Array.isArray(data) ? data : [];

  return (
    // Paper and TableContainer remain, parent Box in Ledger.jsx handles overflow
    <Paper
  sx={{
    width: { xs: '100%', sm: '70%', md: '50%', lg: '100%' },
    overflow: 'hidden',
    padding: 0,
  }}
>

      {/* Increased maxHeight slightly, removed internal overflowY as parent Box has it*/}
      <TableContainer sx={{ maxHeight: 500 }}>
        {/* Added Times New Roman font here */}
        <Table
          stickyHeader
          aria-label="sticky table"
          sx={{
             fontFamily: '"Times New Roman", Times, serif',
             minWidth: columns.reduce((sum, col) => sum + (col.width || 0), 0) // Ensure table itself has a minimum width
           }}
        >
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                // Only render the header cell if it's not the delete column OR delete is enabled
                 (column.id !== 'delete' || enableDelete) && (
                    <TableCell
                    key={column.id} // Key should be column.id
                    align={column.align || 'center'} // Use column align or default to center
                    style={{ // Using style prop for direct CSS control
                      minWidth: column.minWidth, // Apply minWidth from column definition
                      width: column.width, // Allow specific width override if provided
                      fontSize: '1rem', // Slightly smaller font size
                      fontWeight: 'bold',
                      border: '1px solid #ddd',
                      padding: '8px 10px', // Adjust padding
                      boxSizing: 'border-box' // Include padding and border in element's total width/height
                    }}
                  >
                    {column.label}
                  </TableCell>
                 )
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 5 }}>
                       No data available.
                    </TableCell>
                 </TableRow>
            ) : (
                tableData.map((row, index) => { // Added index as fallback key
                    const rowId = rowKey ? row[rowKey] : null; // Get the unique ID for the row
                    if (!rowId) {
                        console.warn("Row missing key property defined by rowKey prop:", rowKey, row);
                        // Fallback to index for key, but warn as this is not ideal for list changes
                    }
                    return (
                        // Use rowId if available, otherwise use index as a fallback key
                        <TableRow hover role="checkbox" tabIndex={-1} key={rowId || index}>
                            {visibleColumns.map((column) => {
                            // Only render the cell if it's not the delete column OR delete is enabled
                            if (column.id === 'delete' && !enableDelete) return null;

                            // Safely access the value using column.id or column.label
                            // It's more robust to consistently use column.id
                            // Assuming data objects keys match column.id
                            const value = row[column.label]; // <-- Changed from row[column.label] to row[column.id]

                            return (
                                // Use column.id for the key here too
                                <TableCell
                                key={column.id}
                                align={column.align || 'center'}
                                style={{
                                    border: '1px solid #ddd',
                                    padding: '6px 8px',
                                    textTransform: column.id === 'narration' ? 'none' : 'none', // Changed to none for all by default
                                    minWidth: column.minWidth, // Apply minWidth here too for cells
                                    boxSizing: 'border-box'
                                }}
                                >
                                {
                                // column.id === 'delete' && enableDelete ? ( // Check enableDelete here again
                                //     <IconButton
                                //         onClick={() => handleDelete(rowId)} // Pass the unique rowId
                                //         disabled={!rowId} // Disable button if no ID
                                //         size="small" // Smaller icon button
                                //     >
                                //     {/* Use the imported DeleteIcon */}
                                //     <DeleteIcon fontSize="small" />
                                //     </IconButton>
                                // ) :
                                 column.render ? ( 
                                    // Pass the whole row to render function if needed
                                    column.render(value, row)
                                ) : (
                                    // Display the value directly
                                    value
                                )}
                                </TableCell>
                            );
                            })}
                        </TableRow>
                    );
                })
             )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DataTable;