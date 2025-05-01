import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  TextField,
  Button,
  Grid, // Corrected Grid import (no longer needs 'item')
  CircularProgress,
  Box,
  Typography,
  InputAdornment,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem as MuiMenuItem, // Renamed to avoid conflict with MenuItem in the virtualized list
  Select,
  Paper,
  ClickAwayListener,
  Popper,
  ListItemText, // Useful for structuring MenuItem content
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import RouteIcon from '@mui/icons-material/Route';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import axios from 'axios';

// Import react-window components
import { FixedSizeList } from 'react-window';
import DeleteIcon from '@mui/icons-material/Delete'; // Make sure DeleteIcon is imported

// Helper function to format date for input fields
const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    console.error("Invalid date provided to formatDateForInput:", date);
    return '';
  }
  const year = d.getFullYear();
  const month = (`0${d.getMonth() + 1}`).slice(-2);
  const day = (`0${d.getDate()}`).slice(-2);
  return `${year}-${month}-${day}`;
};

// Predefined date range options
const dateRangeOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'Last Week', value: 'lastWeek' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Last Year', value: 'lastYear' },
  { label: 'Custom Range', value: 'custom' }
];

// --- Helper function to convert wildcard string to regex ---
const wildcardToRegex = (pattern) => {
  // Escape special regex characters, then replace wildcard (%) with regex .*
  return pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special characters except %
    .replace(/%/g, '.*'); // Replace wildcard % with .*
};

// --- Virtualized Suggestions List Component ---
const ITEM_SIZE = 48; // Approximate height of each suggestion row (matches default MenuItem height)

const VirtualizedSuggestionsList = React.forwardRef(function VirtualizedSuggestionsList(props, ref) {
    const { data, onSelect, highlightedIndex, ...other } = props; // Receive highlightedIndex
    const itemCount = data.length;
    const listHeight = Math.min(itemCount, 8) * ITEM_SIZE + 4;

    // The Row component receives style, index, and data from FixedSizeList
    const Row = useCallback(({ index, style }) => {
      const customer = data[index];
      const isHighlighted = index === highlightedIndex; // Check if this item is highlighted

      return (
        <div style={style} key={customer.acid}>
          <MuiMenuItem
            component="li"
            onClick={() => onSelect(customer)}
            // Apply highlight styling using sx
            sx={{
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
              backgroundColor: isHighlighted ? 'rgba(0, 0, 0, 0.08)' : 'transparent', // Highlight color
              '&:hover': { // Keep hover effect
                 backgroundColor: isHighlighted ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
              },
              // Ensure focus styles match if needed for accessibility
              '&.Mui-focusVisible': {
                 backgroundColor: isHighlighted ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
              }
            }}
            selected={isHighlighted} // Can also use 'selected' prop for MUI styling
          >
             <ListItemText primary={customer.name} secondary={`ID # ${customer.acid} - Route: ${customer.route ||"no"}`} />
          </MuiMenuItem>
        </div>
      );
    }, [data, onSelect, highlightedIndex]); // Dependencies: data, onSelect, highlightedIndex


    return (
      <Box ref={ref} {...other} sx={{ maxHeight: 300, overflowY: 'auto' }}> {/* Outer container for max height and scroll */}
          <FixedSizeList
              ref={ref} // Attach the ref to FixedSizeList instance
              height={listHeight}
              itemSize={ITEM_SIZE}
              itemCount={itemCount}
              outerElementType="div"
              innerElementType="ul"
              itemData={data}
              children={Row}
          />
      </Box>
    );
});


const LedgerSearchForm = React.memo(({ onFetch, loading: ledgerLoading }) => {
  // State for all customer options (fetched once)
  const [allCustomerOptions, setAllCustomerOptions] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState(null);

  const [token, setToken] = useState(localStorage.getItem('authToken')); // State for JWT token (if needed)

  // State for the currently selected customer object
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  // State for the text currently in the customer input field
  const [customerInput, setCustomerInput] = useState('');
  // State for the filtered suggestions based on customerInput
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  // NEW: State for the index of the highlighted suggestion
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // -1 means no item is highlighted

  // Refs for managing Popper positioning and input focus
  const customerInputRef = useRef(null);
  const [popperOpen, setPopperOpen] = useState(false);
  // NEW: Ref for the react-window FixedSizeList instance
  const listRef = useRef(null);


  // Optional search fields
  const [phoneInput, setPhoneInput] = useState('');
  const [routeInput, setRouteInput] = useState('');

  // Date range selection
  const [dateRangeType, setDateRangeType] = useState('thisMonth');

  // Calculate initial dates based on default dateRangeType using useMemo
  const initialDates = useMemo(() => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date();
      return {
          startDate: formatDateForInput(start),
          endDate: formatDateForInput(end)
      };
  }, []); // Calculate only once on mount

  const [dates, setDates] = useState(initialDates);

  // Effect to fetch *all* customer list on mount
  useEffect(() => {
    const fetchCustomerList = async () => {
      setCustomerLoading(true);
      setCustomerError(null);
      try {
        const response = await axios.get('http://100.68.6.110:3001/api/customers',{
          headers: {
            'Authorization': `Bearer ${token}` // Include token in headers if needed
          }
        });

        if (Array.isArray(response.data)) {
          const validOptions = response.data.filter(cust => cust && typeof cust === 'object' && cust.name && cust.acid);
          setAllCustomerOptions(validOptions);
        } else {
          setCustomerError("Failed to load customer list (invalid format from API).");
          setAllCustomerOptions([]);
        }
      } catch (error) {
        const apiErrorMessage = error.response?.data?.message || error.message;
        setCustomerError(`Failed to load customer list: ${apiErrorMessage}`);
        setAllCustomerOptions([]);
      } finally {
        setCustomerLoading(false);
      }
    };

    fetchCustomerList();
  }, []); // Empty dependency array ensures this runs only on mount


  // Effect to filter customer options whenever input changes or options load
  useEffect(() => {
    if (customerInput) {
      try {
          // --- PERFORM WILDCARD FILTERING USING REGEX ---
          // Remove '^' if you want wildcard to match anywhere, keep if you want it to match from the start
          const regexPattern = wildcardToRegex(customerInput); // No start anchor for flexibility
          const regex = new RegExp(regexPattern, 'i'); // 'i' flag for case-insensitive
          const filtered = allCustomerOptions.filter(option =>
             option.name && typeof option.name === 'string' && regex.test(option.name) // Added check for option.name
          );
           // --- END WILDCARD FILTERING ---

          setCustomerSuggestions(filtered);
           // Reset highlighted index when suggestions change, and auto-highlight the first if available
          setHighlightedIndex(filtered.length > 0 ? 0 : -1);

      } catch (e) {
          console.error("Invalid regex pattern from input:", customerInput, e);
          setCustomerSuggestions([]); // Clear suggestions if regex is invalid
          setHighlightedIndex(-1); // Reset highlighted index
      }

    } else {
      setCustomerSuggestions([]);
      setHighlightedIndex(-1); // Reset highlighted index
    }
  }, [customerInput, allCustomerOptions]); // Re-filter when input or options change


  // Effect to scroll the virtualized list when highlightedIndex changes
  useEffect(() => {
      if (popperOpen && listRef.current && highlightedIndex !== -1) {
          listRef.current.scrollToItem(highlightedIndex, 'smart'); // 'smart' aligns to top or bottom as needed
      }
  }, [highlightedIndex, popperOpen]); // Scroll when highlighted index changes or popper opens


  // Handler for customer input field change
  const handleCustomerInputChange = useCallback((event) => {
    const newValue = event.target.value;
    setCustomerInput(newValue);
    // Clear selected customer if the input text doesn't match the selected name
    if (selectedCustomer && selectedCustomer.name !== newValue) {
      setSelectedCustomer(null);
    }
     // Open popper if input has value
     if (newValue) {
         setPopperOpen(true);
     } else {
         setPopperOpen(false);
     }
     // Filtering and highlight reset happen in the useEffect based on customerInput
  }, [selectedCustomer]);


  // Handler for clicking a suggestion
  const handleSuggestionClick = useCallback((customer) => {
    setSelectedCustomer(customer);
    setCustomerInput(customer.name); // Set input value to selected name
    setCustomerSuggestions([]); // Clear suggestions
    setPopperOpen(false); // Close the popper
    setHighlightedIndex(-1); // Reset highlighted index
  }, []);

   // Handler for keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
   const handleInputKeyDown = useCallback((event) => {
      const { key } = event;
      const suggestionCount = customerSuggestions.length;

      // If suggestions are open and there are suggestions to navigate
      if (popperOpen && suggestionCount > 0) {
         if (key === 'ArrowDown') {
             event.preventDefault(); // Prevent cursor movement in input
             setHighlightedIndex(prevIndex =>
                 prevIndex < suggestionCount - 1 ? prevIndex + 1 : (suggestionCount > 0 ? 0 : -1) // Wrap around or stay at 0 if empty
             );
         } else if (key === 'ArrowUp') {
             event.preventDefault(); // Prevent cursor movement in input
             setHighlightedIndex(prevIndex =>
                 prevIndex > 0 ? prevIndex - 1 : (suggestionCount > 0 ? suggestionCount - 1 : -1) // Wrap around or stay at last if empty
             );
         } else if (key === 'Enter') {
             // Check if an item is highlighted before selecting
             if (highlightedIndex !== -1) {
                 event.preventDefault(); // Prevent form submission
                 const selected = customerSuggestions[highlightedIndex];
                 if (selected) {
                     handleSuggestionClick(selected); // Select the highlighted item
                 }
             } else {
                // If Enter is pressed and no item is highlighted,
                // you might want to prevent default if there's input
                // or allow default (e.g., form submission if this is part of a form).
                // For now, let's prevent default if there's input to avoid accidental submission
                if (customerInput) {
                    event.preventDefault();
                     // Optionally trigger a search of the current input text if no suggestion is highlighted?
                     // Or alert the user to select from the list. Let's stick to the alert reminder.
                }
             }
         } else if (key === 'Escape') {
              event.preventDefault(); // Prevent clearing input typically
              setPopperOpen(false); // Close the popper
              setHighlightedIndex(-1); // Reset highlighted index
         }
      } else if (key === 'Enter') {
          // If Enter is pressed and popper is NOT open but there's text in input
          // This case is already handled by the main search button's onClick logic
          // which checks for !selectedCustomer and shows an alert.
          // We just need to ensure default form submission is prevented if needed.
          if (customerInput && !selectedCustomer) {
              event.preventDefault(); // Prevent form submission if input has text but no customer is selected
          }
      } else if (key === 'ArrowDown' && !popperOpen && customerInput) {
           // If down arrow pressed when popper is closed but there's input
           // Optionally reopen popper and highlight first item
           if (customerSuggestions.length > 0) {
               setPopperOpen(true);
               setHighlightedIndex(0);
               event.preventDefault(); // Prevent default scroll
           }
      }

   }, [popperOpen, customerSuggestions, highlightedIndex, handleSuggestionClick, customerInput, selectedCustomer]); // Dependencies for useCallback


   // Handle clicks away from the input and suggestions
   const handleClickAway = useCallback(() => {
       // Close the popper if the click is outside the input field or the popper itself
       // ClickAwayListener handles the event detection. We just set state.
       // Add a slight delay to ensure click on suggestion registers first.
       // This is less critical now that clickaway is simpler, but good practice.
       setTimeout(() => {
          setPopperOpen(false);
           // Don't reset highlightedIndex here, it will be reset when popperOpen becomes false
       }, 50); // Small delay


   }, []);

   // Handler for input blur - slightly delayed to allow click on suggestion
   const handleInputBlur = useCallback(() => {
      // Delay closing the popper slightly to allow a click on a suggestion to register first
      setTimeout(() => {
         // Ensure the popper is closed on blur, *unless* a suggestion was just clicked
         // This is complex with ClickAwayListener, simplify by just closing the popper state.
         // The ClickAwayListener will also fire.
         // Rely primarily on ClickAwayListener and the logic in handleSuggestionClick
         // to close the popper state when an item is selected.
         // This handler can be simplified to just ensure highlight is reset on blur if needed.
         // setHighlightedIndex(-1); // Reset highlight on blur? Depends on desired UX
      }, 100); // Adjust delay if needed
   }, []);

   const handleInputFocus = useCallback(() => {
       // When input is focused, open the popper if input has value and there are suggestions
        if (customerInput && customerSuggestions.length > 0) {
            setPopperOpen(true);
        } else if (!customerInput && allCustomerOptions.length > 0) {
             // Optional: show full list on focus if input is empty.
             // This requires setting customerSuggestions to allCustomerOptions here,
             // which might be slow for very large lists.
             // If you enable this, you also need to reset highlightedIndex to 0 here.
         }
   }, [customerInput, customerSuggestions.length, allCustomerOptions.length]);


  // Handler for date range selection - recalculates dates when type changes
  useEffect(() => {
    const today = new Date();
    let start, end;

    switch (dateRangeType) {
      case 'today':
        start = end = new Date();
        break;

      case 'yesterday':
        start = end = new Date();
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;

      case 'thisWeek':
        start = new Date();
        start.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)
        end = new Date(); // Today
        break;

      case 'lastWeek':
        start = new Date();
        start.setDate(today.getDate() - today.getDay() - 7); // Start of last week
        end = new Date();
        end.setDate(today.getDate() - today.getDay() - 1); // End of last week (Saturday)
        break;

      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(); // Today
        break;

      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
        break;

      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(); // Today
        break;

      case 'lastYear':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;

      case 'custom':
        // Dates are manually controlled by text inputs, do not override
        return;

      default:
         // Fallback to this month if dateRangeType is unexpectedly something else
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
    }

    // Only update state if dates actually change
    const newStartDate = formatDateForInput(start);
    const newEndDate = formatDateForInput(end);
    if (dates.startDate !== newStartDate || dates.endDate !== newEndDate) {
         setDates({
          startDate: newStartDate,
          endDate: newEndDate
        });
    }

  }, [dateRangeType, dates.startDate, dates.endDate]);


  // Handler for manual date changes (for custom range)
  const handleDateChange = useCallback((e) => {
    setDates(prevDates => ({ ...prevDates, [e.target.name]: e.target.value }));
    setDateRangeType('custom');
  }, []); // useCallback memoizes the function

  // Reset all form fields
  const handleReset = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerInput(''); // Clear the input value
    setCustomerSuggestions([]); // Clear suggestions
    setPopperOpen(false); // Close popper on reset
    setHighlightedIndex(-1); // Reset highlighted index
    setPhoneInput('');
    setRouteInput('');
    setDateRangeType('thisMonth');
     const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date();
      setDates({
          startDate: formatDateForInput(start),
          endDate: formatDateForInput(end)
      });
  }, []); // useCallback memoizes the function

  // Trigger search
  const handleTriggerFetch = useCallback(() => {
    // Check if a customer object is actually selected, not just text typed in
    if (!selectedCustomer || !selectedCustomer.acid) {
      alert('Please select a customer from the suggestions list.');
      return;
    }

    onFetch({
      acid: selectedCustomer.acid,
      startDate: dates.startDate,
      endDate: dates.endDate,
      phone: phoneInput,
      route: routeInput
    });
  }, [onFetch, selectedCustomer, dates, phoneInput, routeInput]);


  return (
    <Box>
      {/* Removed item prop from container Grid as per MUI v5+ */}
      <Grid container spacing={2}>
        {/* Customer Search Input */}
        {/* Removed item prop from item Grid as per MUI v5+ */}
        <Grid xs={12} sx={{ overflowX: 'hidden' }}>
          <ClickAwayListener onClickAway={handleClickAway}>
            <Box sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                label="Customer"
                variant="outlined"
                required
                value={customerInput}
                onChange={handleCustomerInputChange}
                onFocus={handleInputFocus} // Open popper on focus
                onBlur={handleInputBlur}   // Close popper on blur with delay
                onKeyDown={handleInputKeyDown} // NEW: Add keydown handler
                inputRef={customerInputRef} // Attach ref for Popper
                error={!!customerError || (!selectedCustomer && customerInput.length > 0 && !customerLoading)} // Show error if input has text but no customer is selected and not loading
                helperText={customerError || (customerLoading ? 'Loading customers...' : '') || (!selectedCustomer && customerInput.length > 0 && !customerLoading && 'Please select a customer from the list.')} // Helper text for loading, error, or selection reminder
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {customerLoading ? <CircularProgress color="primary" size={20} /> : <PersonIcon color="primary" />}
                    </InputAdornment>
                  ),
                  endAdornment: ( // Optional: Add a clear button
                    customerInput && (
                       <InputAdornment position="end">
                         <IconButton
                            onClick={() => {
                                setCustomerInput('');
                                setSelectedCustomer(null);
                                setCustomerSuggestions([]);
                                setPopperOpen(false);
                                setHighlightedIndex(-1); // Reset highlighted index
                                customerInputRef.current?.focus(); // Focus input after clearing
                            }}
                            edge="end"
                            size="small"
                         >
                           <RestartAltIcon />
                         </IconButton>
                       </InputAdornment>
                    )
                  )
                }}
              />

              {/* Suggestions Popper */}
              <Popper
                open={popperOpen && customerSuggestions.length > 0} // Only open if popperOpen state is true AND there are suggestions
                anchorEl={customerInputRef.current} // Anchor to the input field
                placement="bottom-start"
                sx={{ zIndex: 1300, width: { xs: '70%', sm: '70%', md: '50%', lg: '30%' },   overflowX:"hidden" }} // Ensure it's above other content and matches input width
              >
                <Paper elevation={3}>
                   {/* Use the virtualized list component */}
                   {/* Pass customerSuggestions as data and the select handler */}
                   <VirtualizedSuggestionsList
                       ref={listRef} // NEW: Pass the listRef to the virtualized list
                       data={customerSuggestions}
                       onSelect={handleSuggestionClick}
                       highlightedIndex={highlightedIndex} // NEW: Pass highlighted index
                   />
                </Paper>
              </Popper>

            </Box>
          </ClickAwayListener>

          {/* Error/Loading/Selected Customer messages */}
          {/* Only show this message if no error, not loading, and the customer list is empty */}
          {!customerLoading && allCustomerOptions.length === 0 && !customerError && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'flex', alignItems: 'center' }}
            >
              <ErrorOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
              No customer data found or API unavailable.
            </Typography>
          )}
          {/* Error message only if not loading and error exists */}
          {!customerLoading && customerError && (
            <Typography
              variant="caption"
              color="error"
              sx={{ mt: 1, display: 'flex', alignItems: 'center' }}
            >
              <ErrorOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
              {customerError}
            </Typography>
          )}
           {/* Display selected customer name below the input */}
          {selectedCustomer && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Selected: {selectedCustomer.name} (ID: {selectedCustomer.acid})
              </Typography>
          )}
        </Grid>

        {/* Date Range Selector */}
        {/* Removed item prop from item Grid as per MUI v5+ */}
        <Grid xs={12}>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="date-range-label">Date Range</InputLabel>
            <Select
              labelId="date-range-label"
              id="date-range-select"
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value)}
              label="Date Range"
              startAdornment={
                <InputAdornment position="start">
                  <EventIcon color="primary" />
                </InputAdornment>
              }
            >
              {dateRangeOptions.map((option) => (
                <MuiMenuItem key={option.value} value={option.value}> {/* Using MuiMenuItem for Select */}
                  {option.label}
                </MuiMenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Show date inputs only for custom range */}
        {dateRangeType === 'custom' && (
          <>
             {/* Removed item prop from item Grids as per MUI v5+ */}
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                name="startDate"
                type="date"
                variant="outlined"
                value={dates.startDate}
                onChange={handleDateChange}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EventIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

             {/* Removed item prop from item Grids as per MUI v5+ */}
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                name="endDate"
                type="date"
                variant="outlined"
                value={dates.endDate}
                onChange={handleDateChange}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EventIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </>
        )}

        {/* Optional Fields */}
         {/* Removed item prop from item Grids as per MUI v5+ */}
        <Grid xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone (Optional)"
            name="phone"
            variant="outlined"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

         {/* Removed item prop from item Grids as per MUI v5+ */}
        <Grid xs={12} sm={6}>
          <TextField
            fullWidth
            label="Route (Optional)"
            name="route"
            variant="outlined"
            value={routeInput}
            onChange={(e) => setRouteInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <RouteIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid xs={12}>
          <Divider sx={{ my: 1 }} />
        </Grid>

        {/* Action Buttons */}
         {/* Removed item prop from item Grids as per MUI v5+ */}
        <Grid xs={12} sm={6}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            disabled={ledgerLoading || customerLoading}
            sx={{ height: '56px' }}
          >
            Reset
          </Button>
        </Grid>

         {/* Removed item prop from item Grids as per MUI v5+ */}
        <Grid xs={12} sm={6}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={ledgerLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
            onClick={handleTriggerFetch}
             // Disable if loading, no customer selected, customer list loading, or customer list is empty/ errored
            disabled={ledgerLoading || !selectedCustomer || customerLoading || allCustomerOptions.length === 0 || customerError}
            sx={{ height: '56px' }}
          >
            {ledgerLoading ? 'Searching...' : 'Search'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
});

export default LedgerSearchForm;