import React, { useState, useEffect, useRef } from "react";
import DataTable from "./table";
import TextInput from "./Textfield";
import {
  Container,
  Typography,
  TextField,
  // TextInput,
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
} from "@mui/material";
import { AddCircleOutline, DeleteOutline, Print, SignalCellularNull } from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";

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
  { label: "Product", size: 2 },
  { label: "B.Q", size: 1 },
  { label: "Scheme", size: 1 },
  { label: "T.Q", size: 1 },
  { label: "Price", size: 1 },
  { label: "Discount", size: 1 },
  { label: "Amount", size: 2 },
];

// invoice model
const BillingComponent = ({name= "Invoice"}) => {
  const [invoice, setInvoice] = useState({ items: [] });
  const [formData, setFormData] = useState([]);
  const [customer, setCustomer] = useState([]);
  const [product, setProduct] = useState([]);
  const [formattedDate, setFormattedDate] = useState("");
  const buttonRef = useRef(null)


   useEffect(() => {
    console.log("data", formData)
    calQtyAmount()
  }, [product]);

  useEffect(() => {
    console.log("Invoice:", invoice);
  }, [invoice]);
  
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0); // Midnight tonight
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      const newCurrentDate = new Date(); // Get updated current date to prevent date going stale
      const newYear = newCurrentDate.getFullYear();
      const newMonth = String(newCurrentDate.getMonth() + 1).padStart(2, '0');
      const newDay = String(newCurrentDate.getDate()).padStart(2, '0');
      setFormattedDate(`${newYear}-${newMonth}-${newDay}`);
    }, timeUntilMidnight);

    return () => clearTimeout(timeoutId); // Cleanup the timeout on unmount
  }, []); // Empty dependency array means this only runs once

useEffect(() => {
  const handleKeyDown = (event) => {
    if (event.altKey && event.key === 'b') {
      event.preventDefault(); // Prevent default browser behavior (if any)

      // Programmatically trigger the click event on the button
      if (buttonRef.current) {
        buttonRef.current.click();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown); // Clean up the event listener
  };
}, []); // Empty dependency array ensures this effect runs only once on mount
  

  const handleChange = (name, e) => {
    const { value } = e.target;
    const updatedValue =
      name === "Quantity" || name === "Price" || name === "Discount"
        ? parseFloat(value)
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: updatedValue,
    }));
  };

  const calQtyAmount = () => {

    let price = product?.salePrice || 0

    // Calculate the amount based on quantity and price
    const amount = price * formData.Quantity || 0
    const discount = formData.Discount || 0
    const totalAmount = amount - (amount * discount) / 100


    // Update the formData with the calculated amount
    setFormData((prev) => ({
      ...prev,
      Amount: totalAmount,
      Price: price,
    }));
    
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newItem = {
      id: invoice.items.length + 1, // Generate a unique ID for the new item
      spo: formData.SPO || "",
      location: formData.Location,
      product: formData.Product || "",
      name: `${product.name}` || "",
      company: product.company || "",
      model: product.model || "",
      quantity: formData.Quantity || 1,
      price: formData.Price || 0,
      amount: formData.Amount || 0,
      discount: formData.Discount || 0, // Get discount from formData
    };

    const updatedInvoice = {
      ...invoice,
      items: [...invoice.items, newItem],
      totalAmount: calculateTotal(),
    };

    setInvoice(updatedInvoice);
    setFormData({
      SPO: "",
      Location: "",
      Product: 0,
      Quantity: 0,
      Price: 0,
      Discount: 0,
      Amount: 0,
    });
  };

  const removeItem = (id) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const updateItem = (id, field, value) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handlePost = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/invoices",
        invoice
      );

      if (response.status === 201 || response.status === 200) {
        console.log("Invoice saved successfully");
      } else {
        console.error("Failed to save invoice");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const calculateSubtotal = () => {
    // Ensure invoice.items is defined and is an array
    return Array.isArray(invoice.items)
      ? invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
      : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal;
  };

  const getProductDetails = async (id) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/products/${id}`
      );
      setProduct(response.data);
      console.log(response.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  // Handle enter key press and add item
  const handleTab = (name, e) => {
    if (e.key === "Tab") {
      handleChange(name, e);
      if (name === "Product") {
        getProductDetails(e.target.value);
        calQtyAmount();
      } 
      return;
    }
  };

  // Handle input change for customer information
  const handleCustomer = async (value) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/customers/${value}`
      );
      setCustomer(response.data);
      // setCustomerId(customer.customerId);
      setInvoice((prev) => ({
        ...prev,
        customer: response.data,
      }));
    } catch (error) {
      alert("Customer not found. Enter a valid id");
    }
  }; 
   // Handle input change for customer information
  const handleInputChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <ThemeProvider theme={theme}>
      <Container sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 2, width: "100%" }}>
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Grid item sx={{ width: "10%" }}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {name}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                # {invoice.invoiceNumber || "not yet"} 
              </Typography>
            </Grid>
            <Grid item textAlign="center" sx={{ width: "33%" }}>
              <Typography variant="h4" fontWeight="bold">
                AHMAD INTERNATIONAL
              </Typography>
            </Grid>
            <Grid item xs={2}>
              <TextField
                size="small"
                label="Invoice Date"
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={formattedDate}
                // onChange={(e) =>
                //   setInvoice((prev) => ({
                //     ...prev,
                //     date: e.target.value,
                //   }))
                // }
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 4 }} />
         
          {/* Customer Details */}
          <Grid container spacing={1} justifyContent={"center"} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Typography
                variant="h6"
                fontWeight="bold"
                textAlign="center"
                sx={{ marginBottom: 2 }}
              >
                CUSTOMER ACCOUNT
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                {/* <Grid item xs={1}>
                  <TextInput
                    label={"Acc #"}
                    onChange={(e) => handleCustomer(e.target.value)}
                    type="text"
                    fullWidth
                  />
                </Grid> */}

                <Grid>
                  <TextInput
                    value={customer.name}
                    type="text"
                    label={"Customer Name"}
                    disabled
                    fullWidth
                  />
                </Grid>

                {/* <Grid item xs={3}>
                  <TextInput
                    value={customer.address}
                    type="text"
                    fullWidth
                    disabled
                  />
                </Grid> */}
              </Grid>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 4 }} />

          {/* Product Details */}
          {/* <Grid container spacing={1} justifyContent={"center"} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Typography
                variant="h6"
                fontWeight="bold"
                textAlign="center"
                sx={{ marginBottom: 2 }}
              >
                PRODUCT DETAILS
              </Typography>
              <Grid container spacing={2} justifyContent="center" 
               fullWidth
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 3,
                  justifyContent: "center",
                }}
              >
                {productDetail.map((field, key) => {
                  return (
                    <Grid item xs={4} md={field.size} sm={field.size} lg={field.size}
                    fullWidth
                    key={key}>
                    <TextInput
                      label={field.label}
                      // size={field.size}
                      textAlign="center"
                      alignItems="center"
                      onChange={(e) => {
                        const value = e.target.value;
                        // Update your state management here
                         handleInputChange(field.label, value);
                      }}
                      onKeyDown={(e) => handleTab(field.label, e)}
                      onKeyPress={handleEnter}
                      type={
                        ["Quantity", "Price", "Discount", "Amount"].includes(
                          field.label
                        )
                          ? "number"
                          : "text"
                      }
                      value={formData[field.label] || ""}
                    />
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          </Grid> */}
          {/* <Grid>
          <TextInput
                    label={"Product Name"}
                    value={`${product?.name?.toUpperCase() || ""} - ${product?.company?.toUpperCase() || ""}`}
                    type="text"
                    fullWidth
                    disabled
                  />
          </Grid> */}

          {/* Products List Table */}
{/* Products List Table */}
<Grid item xs={12} sx={{ marginTop: 3 }}>
<DataTable
  data={invoice?.items ?? []} // Ensure items is always an array
  columns={productDetail
    .map((field) => ({
      id: field.label.toLowerCase(), // This is fine, but data needs to match
      label: field.label,
      align: "center",
      width: field.label === "Product" ? "40%" : "10%",
      minWidth: field.label === "Product" ? 200 : 100,

      render: (value, row) => {
        // Define display value based on field type
        let displayValue = "";
        
        // Set the correct display value based on field type
        if (field.label === "Product") {
          displayValue = `${row.name?.toUpperCase() || "error"} - ${row.company?.toUpperCase() || ""}`;
        } else if (field.label === "SPO") {
          displayValue = row.spo || "";
        } else if (field.label === "Location") {
          displayValue = row.location || "";
        } else if (field.label === "Quantity") {
          displayValue = row.quantity || "";
        } else if (field.label === "Price") {
          displayValue = row.price || "";
        } else if (field.label === "Discount") {
          displayValue = row.discount || "";
        } else if (field.label === "Amount") {
          // Calculate amount if needed
          const amount = row.quantity && row.price 
            ? (row.quantity * row.price) * (1 - (row.discount || 0)/100)
            : row.amount || "";
          displayValue = amount;
        }

        return (
          <TextField
            variant="standard"
            value={displayValue}
            onChange={(e) => {
              updateItem(
                row?.id ?? "", 
                field.label.toLowerCase(),
                ["Quantity", "Price", "Discount"].includes(field.label)
                  ? parseFloat(e.target.value) || 0
                  : e.target.value
              )
            }}
            type={
              ["Quantity", "Price", "Discount"].includes(field.label)
                ? "number"
                : "text"
            }
            inputProps={{
              min: field.label === "Quantity" ? 1 : undefined,
              style: {
                padding: "0px",
                textAlign: "center",
              },
            }}
            sx={{ 
              width: "100%",
              ...(field.label === "Product" && { gridColumn: "span 4" })
            }}
          />
        )
      },
    }))
    .concat({
      id: "delete",
      label: "Actions",
      width: "5%",
      minWidth: 50,
    })}
  onDelete={removeItem}
  rowKey="id"
  apiEndpoint="invoices"
  sx={{
    border: "1px solid #eee",
    "& .MuiTableCell-root": {
      border: "1px solid #ddd",
      padding: ".25rem",
      boxSizing: "border-box",
    },
    width: "100%",
    tableLayout: "fixed",
  }}
/>
</Grid>


          {/* Totals and Notes */}
          <Box sx={{ mt: 3 }}>
            <Typography textAlign={"right"}>
              Total: {calculateTotal().toFixed(2)}
            </Typography>
          </Box>

          {/* Notes Section */}
          <TextField
            label="Additional Notes"
            variant="outlined"
            sx={{ mt: 4 }}
            value={invoice.notes}
            onChange={(e) =>
              setInvoice((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
          />

          {/* Print Button */}
          <Box textAlign="center" sx={{ mt: 4 }}>
            {/* <Button
              variant="contained"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print Invoice
            </Button> */}
            <Button variant="contained" onClick={()=> {handlePost()}} ref={buttonRef}>
            Submit
          </Button>

          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default BillingComponent;
