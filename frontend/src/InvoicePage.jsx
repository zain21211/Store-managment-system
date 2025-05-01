import  React, { useState, useEffect, useCallback } from "react";
import TextInput from "./componets/Textfield";
import {
  Container,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Grid,
  Divider,
  Box,
  useTheme,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { AddCircleOutline, DeleteOutline, Print, Edit, Visibility } from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
// import debounce from 'lodash.debounce'; // Import debounce

const theme = createTheme({
  palette: {
    primary: {
      main: "#2d3436",
    },
    secondary: {
      main: "#0984e3",
    },
  },
  typography: {
    fontFamily: "Poppins, Arial, sans-serif",
  },
});

const productDetail = [
  { label: "SPO", size: 2 },
  { label: "Location", size: 1 },
  { label: "ProductId", size: 2 },
  { label: "Quantity", size: 1 },
  { label: "Price", size: 1 },
  { label: "Discount", size: 1 },
  { label: "Amount", size: 2 },
];

// invoice model
import axios from 'axios'; // Import axios

// ... theme and productDetail constants ...

const InvoicePage = ({ initialInvoice, mode }) => {
    const [invoice, setInvoice] = useState({
        number: "",
        date: new Date().toISOString().split("T")[0],
        dueDate: "",
        client: { accountId: "", name: "", address: "" },
        items: [{ id: 0, product: "", quantity: 0, price: 0, amount: 0 }],
        discount: 0,
        notes: "",
    });
    const [formData, setFormData] = useState({});
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [lastInvoiceNumber, setLastInvoiceNumber] = useState(0);
    const [loadingInvoice, setLoadingInvoice] = useState(false); // Loading state
    const [error, setError] = useState(null); // Error state


    useEffect(() => {
        const fetchLastInvoiceNumber = async () => {
            try {
                // Fetch latest invoice to determine next number (adjust API endpoint if needed)
                const response = await axios.get('/api/invoices'); // Example endpoint to get latest invoice
                if (response.data && response.data.length > 0) {
                    const latestInvoiceNumber = parseInt(response.data[0].invoiceNumber, 10);
                    setLastInvoiceNumber(latestInvoiceNumber);
                    setInvoice(prevInvoice => ({ ...prevInvoice, number: String(latestInvoiceNumber + 1) }));
                } else {
                    setLastInvoiceNumber(0);
                    setInvoice(prevInvoice => ({ ...prevInvoice, number: "1" })); // Start with 1 if no invoices
                }
            } catch (error) {
                console.error("Error fetching last invoice number:", error);
                setInvoice(prevInvoice => ({ ...prevInvoice, number: "1" })); // Default to 1 on error
            }
        };


        fetchLastInvoiceNumber(); // Fetch last invoice number on component mount


        if (mode === 'edit' || mode === 'view') {
            if (initialInvoice) {
                setInvoice(initialInvoice);
            } else {
                console.warn("InvoicePage in edit/view mode but no initialInvoice prop provided.");
            }
        }

        if (mode === 'view') {
            setIsReadOnly(true);
        } else {
            setIsReadOnly(false);
        }
    }, [initialInvoice, mode]);


    // Function to fetch invoice by number (Now makes API call)
    const fetchInvoiceByNumber = async (invoiceNumber) => {
        if (!invoiceNumber || invoiceNumber.trim() === "") {
            resetFormToNewInvoice();
            return;
        }
        setLoadingInvoice(true); // Set loading state
        setError(null); // Clear any previous errors
        try {
            const response = await axios.get(`/api/invoices/number/${invoiceNumber}`);
            if (response.data) {
                setInvoice(response.data);
            } else {
                setError(`Invoice number ${invoiceNumber} not found.`); // Set error message
                resetFormToNewInvoice();
            }
        } catch (error) {
            console.error("Error fetching invoice:", error);
            setError(`Error fetching invoice number ${invoiceNumber}. Please check server.`); // Set generic error message
            resetFormToNewInvoice();
        } finally {
            setLoadingInvoice(false); // Clear loading state
        }
    };


    const resetFormToNewInvoice = () => {
        setInvoice({
            number: String(lastInvoiceNumber + 1),
            date: new Date().toISOString().split("T")[0],
            dueDate: "",
            client: { accountId: "", name: "", address: "" },
            items: [{ id: 0, product: "", quantity: 0, price: 0, amount: 0 }],
            discount: 0,
            notes: "",
        });
    };



  const handleChange = (name, e) => {
    if (isReadOnly && mode === 'view') return;

    const { value } = e.target;
    const updatedValue =
      name === "Quantity" || name === "Price" || name === "Discount"
        ? parseFloat(value)
        : value;


    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]: updatedValue,
      };

      newFormData.Amount =
        (newFormData.Price || 0) * (newFormData.Quantity || 0) -
        (newFormData.Discount || 0);

      return newFormData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isReadOnly && mode === 'view') return;

    const newItem = {
      id: invoice.items.length + 1,
      spo: formData.SPO || "",
      location:formData.Location,
      productid: formData.ProductId || "",
      quantity: formData.Quantity || 1,
      price: formData.Price || 0,
      amount: formData.Amount || 0,
    };

    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  console.log(formData)
    setFormData({
      SPO: "",
      Location: "",
      ProductId: 0,
      Quantity: 1,
      Price: 0,
      Discount: 0,
      Amount: 0,
    });
  };


  const addItem = () => {
    if (isReadOnly && mode === 'view') return;
    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: prev.items.length,
          product: "",
          quantity: 1,
          price: 0,
          amount: 0,
        },
      ],
    }));
  };

  const removeItem = (id) => {
    if (isReadOnly && mode === 'view') return;
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const updateItem = (id, field, value) => {
    if (isReadOnly && mode === 'view') return;
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const calculateSubtotal = () => {
    return invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - invoice.discount;
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
      console.log("enter")
    }
  };

  const handleInputChange = (field, value) => {
    if (isReadOnly && mode === 'view') return;
    setInvoice((prev) => ({
      ...prev,
      client: { ...prev.client, [field]: value },
    }));
  };

  const handleInvoiceDataChange = (field, value) => {
    if (isReadOnly && mode === 'view') return;
    setInvoice((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

     // Handle Invoice Number Change (API Call Integration)
     const handleInvoiceNumberChange = (e) => {
      const newInvoiceNumber = e.target.value;
      setInvoice(prevInvoice => ({ ...prevInvoice, number: newInvoiceNumber }));
      fetchInvoiceByNumber(newInvoiceNumber); // Call API to fetch invoice by number
  };
  const handlePrintOrSave = async () => { // Make handlePrintOrSave async for API calls
    if (mode === 'view') {
        window.print();
    } else {
        try {
            const invoiceDataToSave = { // Prepare data for backend - adjust as needed
                ...invoice,
                invoiceNumber: invoice.number, // Ensure invoiceNumber is sent
                // ... map other fields as needed to match backend schema if names are different
            };
            const response = await axios.post('/api/invoices', invoiceDataToSave); // POST to create new invoice
            if (response.status === 201) { // Assuming 201 Created on success
                localStorage.setItem('lastInvoiceNumber', invoice.number); // Update last invoice number
                alert('Invoice Created Successfully!');
                resetFormToNewInvoice(); // Reset for new invoice
            } else {
                alert('Failed to create invoice. Server error.');
                console.error('Server error creating invoice:', response);
            }

        } catch (error) {
            console.error('Error saving/creating invoice:', error);
            alert('Error saving/creating invoice. Please check console.');
        }
    }
};



  const getModeTitle = () => {
    switch (mode) {
      case 'edit': return 'Edit Invoice';
      case 'view': return 'View Invoice';
      default: return 'Create New Invoice';
    }
  };

  const getSubmitButtonText = () => {
    switch (mode) {
      case 'edit': return 'Save Changes';
      case 'view': return 'Print Invoice';
      default: return 'Create Invoice';
    }
  };



  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ py: 4, width: "300%" }}>
        <Paper elevation={3} sx={{p:2, width: "125%" }}>
          <Grid container justifyContent="space-between" alignItems="center" sx={{mb:1 }}>
            <Grid item sx={{ width: "20%" }}> {/* Increased width for TextField */}
              <Typography variant="h5" fontWeight="bold" color="primary">
                INVOICE
              </Typography>
              <TextField
                size="small"
                label="Invoice Number"
                variant="outlined"
                value={invoice.number}
                onChange={handleInvoiceNumberChange} // Use handleInvoiceNumberChange
                InputProps={{
                  readOnly: isReadOnly && mode === 'view',
                }}
              />
            </Grid>
            <Grid item textAlign="center" sx={{ width: "33%" }}>
              <Typography variant="h4" fontWeight="bold">
                CARTO
              </Typography>
              <Typography variant="subtitle1" >
                {getModeTitle()}
              </Typography>
            </Grid>
            <Grid item xs={2}>
              <TextField
                size="small"
                label="Invoice Date"
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={invoice.date}
                onChange={(e) => handleInvoiceDataChange('date', e.target.value)}
                InputProps={{
                  readOnly: isReadOnly && mode === 'view',
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 4 }} />

          {/* Customer Details */}
          <Grid container spacing={1} justifyContent={"center"} sx={{ mb: 4 }}>
            <Grid item xs={1} md={20}>
              <Typography variant="h6" fontWeight="bold" textAlign="center" sx={{ marginBottom: 2 }}>
                CUSTOMER ACCOUNT
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                <Grid item xs={1}>
                  <TextInput
                    label={"Acc #"}
                    value={invoice.client.accountId}
                    onChange={(e) => handleInputChange("accountId", e.target.value)}
                    type="text"
                    fullWidth
                    readOnly={isReadOnly && mode === 'view'}
                  />
                </Grid>

                <Grid item xs={8}>
                  <TextInput
                    label={"Name"}
                    value={invoice.client.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    type="text"
                    fullWidth
                    readOnly={isReadOnly && mode === 'view'}
                  />
                </Grid>

                <Grid item xs={3}>
                  <TextInput
                    label={"Address"}
                    value={invoice.client.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    type="text"
                    fullWidth
                    readOnly={isReadOnly && mode === 'view'}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 4 }} />

          {/* Product Details */}
          <Grid container spacing={1} justifyContent={"center"} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight="bold" textAlign="center" sx={{ marginBottom: 2 }}>
                PRODUCT DETAILS
              </Typography>
              <Container sx={{ display: "flex", flexDirection: "row", gap: 3, justifyContent: "center" }}>
                {productDetail.map((field, key) => (
                  <TextInput
                    key={key}
                    label={field.label}
                    size={field.size}
                    onChange={e => handleChange(field.label, e)}
                    onKeyDown={handleEnter}
                    type={
                      ["Quantity", "Price", "Discount", "Amount"].includes(field.label)
                        ? "number"
                        : "text"
                    }
                    InputProps={{
                      readOnly: field.label === "Amount" || (isReadOnly && mode === 'view'),
                    }}
                    required={["SPO", "Quantity", "Price"].includes(field.label) && !(isReadOnly && mode === 'view')}
                    fullWidth
                    readOnly={isReadOnly && mode === 'view'}
                  />
                ))}
              </Container>
            </Grid>
          </Grid>

          {/* Add Item Button */}
          {!isReadOnly && mode !== 'view' && (
            <Box textAlign="center" sx={{ mb: 2 }}>
              <Button variant="outlined" startIcon={<AddCircleOutline />} onClick={handleSubmit}>
                Add Product
              </Button>
            </Box>
          )}


          {/* Products List Table */}
          <Grid item xs={12} sx={{ marginTop: 3 }}>
            <TableContainer component={Paper} sx={{ border: "1px solid #eee" }}>
              <Table sx={{ borderCollapse: "collapse" }}>
                <TableHead>
                  <TableRow>
                    {productDetail.map((field) => (
                      <TableCell
                        key={field.label}
                        align={field.label === "Amount" || field.label === "Price" ? "right" : "center"}
                        sx={{ border: "1px solid #ddd" }}
                      >
                        {field.label}
                      </TableCell>
                    ))}
                    <TableCell width={50} sx={{ border: "1px solid #ddd" }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      {productDetail.map((field) => {
                        let value = item[field.label.toLowerCase()];

                        if (field.label === "Amount") {
                          value = (item.quantity * item.price).toFixed(2);
                        }

                        return (
                          <TableCell
                            key={field.label}
                            align={field.label === "Amount" || field.label === "Price" ? "right" : "center"}
                            sx={{ border: "1px solid #ddd" }}
                          >
                            <TextField
                              variant="standard"
                              value={value}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  field.label.toLowerCase(),
                                  field.label === "Quantity" || field.label === "Price" || field.label === "Discount"
                                    ? parseFloat(e.target.value)
                                    : e.target.value
                                )
                              }
                              type={field.label === "Quantity" || field.label === "Price" || field.label === "Discount" ? "number" : "text"}
                              inputProps={field.label === "Quantity" ? { min: 1 } : {}}
                              sx={{ padding: "0px" }}
                              InputProps={{
                                readOnly: isReadOnly && mode === 'view',
                              }}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell align="center" sx={{ border: "1px solid #ddd" }}>
                        {!isReadOnly && mode !== 'view' && (
                          <IconButton onClick={() => removeItem(item.id)} color="error">
                            <DeleteOutline />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>



          {/* Totals and Notes */}
          <Box sx={{ mt: 3 }}>
            <Typography textAlign={"right"}>Total: {calculateTotal().toFixed(2)}</Typography>
          </Box>

          {/* Notes Section */}
          <TextField

            label="Additional Notes"
            variant="outlined"
            sx={{ mt: 4 }}
            value={invoice.notes}
            onChange={(e) => handleInvoiceDataChange('notes', e.target.value)}
            InputProps={{
              readOnly: isReadOnly && mode === 'view',
            }}
            fullWidth
            multiline
            rows={3}
          />

          {/* Print Button */}
          <Box textAlign="center" sx={{ mt: 4 }}>
            <Button
              variant="contained"
              startIcon={mode === 'view' ? <Print /> : <Edit />}
              onClick={handlePrintOrSave}
            >
              {getSubmitButtonText()}
            </Button>
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default InvoicePage;