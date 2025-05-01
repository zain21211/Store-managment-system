import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Box, // Ensure Box is imported
  Card,
  CardContent,
  Divider,
} from "@mui/material";

// Import custom components
import DataTable from "./table";
import LedgerSearchForm from "./CustomerSearch";

// Helper function for number formatting
const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) {
    return "0.00";
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Define Ledger Columns configuration
const ledgerColumns = [
  {
    id: "date",
    label: "Date",
    align: "left",
    render: (value) => (value ? new Date(value).toLocaleDateString() : "N/A"),
    width: 5,
  },
  {
    id: "Invoice",
    label: "Doc",
    align: "left",
    render: (value) => (value ? value : "N/A"),
    width: 5,
  },
  {
    id: "narration",
    label: "Narration",
    align: "left",
    width: 200, // Might need adjusting for mobile
    minWidth: 200, // Might need adjusting for mobile
  },
  {
    id: "debit",
    label: "Debit",
    align: "right",
    render: (value) => formatCurrency(value),
    width: 10,
  },
  {
    id: "credit",
    label: "Credit",
    align: "right",
    render: (value) => formatCurrency(value),
    width: 10,
  },
  {
    id: "balance",
    label: "Total",
    align: "right",
    render: (value) => formatCurrency(value),
    width: 10,
  },
];

const Ledger = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(
    JSON.parse(localStorage.getItem("user"))
  );
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [summary, setSummary] = useState({
    totalDebit: 0,
    totalCredit: 0,
    netBalance: 0,
  });

  // Function to fetch data
  const handleFetchData = useCallback(async (params) => {
    if (!params || !params.acid) {
      setError("Customer ID parameter is missing.");
      setSearchAttempted(true);
      return;
    }

    const { acid, startDate, endDate } = params;

    setLoading(true);
    setError(null);
    setRows([]);
    setSearchAttempted(true);
    setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 }); // Reset summary on new search

    try {
      const url = `http://100.68.6.110:3001/ledger`;
      console.log(
        `Fetching Ledger from: ${url} with params: acid=${acid}, startDate=${startDate}, endDate=${endDate}`
      );

      const response = await axios.get(url, {
        params: { acid, startDate, endDate },
      });

      if (Array.isArray(response.data)) {
        // Sort data by date
        const sortedData = response.data.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );

        // Calculate running balance and summary statistics
        let balance = 0;
        let totalDebit = 0;
        let totalCredit = 0;

        const processedData = sortedData.map((item) => {
          const debit = Number(item.debit || 0);
          const credit = Number(item.credit || 0);

          balance += credit - debit;
          totalDebit += debit;
          totalCredit += credit;

          return {
            ...item,
            balance,
          };
        });

        setSummary({
          totalDebit,
          totalCredit,
          netBalance: totalCredit - totalDebit,
        });

        setRows(processedData);
      } else {
        console.warn("API did not return an array:", response.data);
        setRows([]);
        setError("Received unexpected data format from server.");
      }
    } catch (fetchError) {
      console.error("Error fetching ledger data:", fetchError);
      setError(
        fetchError.response?.data?.message ||
          "Failed to fetch ledger data. Please check your network connection or contact support."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const uniqueRowKey = "_id"; // Assuming your data has a unique _id field

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: {xs: 0, sm: 1, md: 1 }}}>
      <Box sx={{ mb: 6, textAlign: "center" }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            letterSpacing: -0.5,
            fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
            mb: 3,
          }}
        >
          Account Ledger
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 500,
            letterSpacing: -0.5,
            fontSize: { xs: "1rem", sm: "2rem", md: "2.5rem" },
            mb: 0,
          }}
        >
         <b> USERNAME:    </b>{userData.username}
        </Typography> 
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 500,
            letterSpacing: -0.5,
            fontSize: { xs: "1rem", sm: "2rem", md: "2.5rem" },
            mb: 0,
          }}
        >
          <b>USERTYPE:    </b>{userData.userType}
        </Typography>
      </Box>

      {/* Fixed MUI Grid V5 usage - removed 'item' prop, used breakpoint props on item Grids */}
      <Grid
        container
        spacing={4}
        sx={{ display: "flex", flexDirection: " column", m:{ xs: 0, sm: 0, md: 0 } }}
      >
        <Grid xs={12} md={4}>
          {" "}
          {/* Corrected Grid usage */}
          <Card elevation={2} sx={{ height: "100%" }}>
            <CardContent>
              <LedgerSearchForm onFetch={handleFetchData} loading={loading} />
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          {" "}
          {/* Corrected Grid usage */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 1 }}
              variant="filled"
            >
              {error}
            </Alert>
          )}
          {loading ? (
            <Paper
              sx={{
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",

                alignItems: "center",
                py: 8,
                borderRadius: 1,
              }}
            >
              <CircularProgress size={40} />
              <Typography sx={{ ml: 2 }}>Loading ledger data...</Typography>
            </Paper>
          ) : rows.length >= 0 ? (
            <>
              {/* Optional Summary Card (uncomment if needed) */}
              {/* <Card elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  <Typography variant="h6">Transaction Summary</Typography>
                </Box>
                <Divider />
                <Grid container sx={{ p: 2 }}>
                  <Grid xs={12} sm={4} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Debits</Typography>
                    <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600 }}>
                      {formatCurrency(summary.totalDebit)}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={4} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Credits</Typography>
                    <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600 }}>
                      {formatCurrency(summary.totalCredit)}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={4} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Net Balance</Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: summary.netBalance >= 0 ? 'success.main' : 'error.main'
                      }}
                    >
                      {formatCurrency(summary.netBalance)}
                    </Typography>
                  </Grid>
                </Grid>
              </Card> */}

              <Card elevation={2}>
                {/* Added Box with overflowX: 'auto' for responsive scrolling */}
                <Box
                  sx={{
                    width: "100%",
                    overflowX: "auto",
                    margin: "auto",
                    textAlign: "center",
                  }}
                >
                  <DataTable
                    data={rows}
                    columns={ledgerColumns}
                    rowKey={uniqueRowKey}
                    showPagination={true}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                  />
                </Box>
              </Card>
            </>
          ) : (
            !error &&
            searchAttempted && (
              <Paper
                sx={{
                  textAlign: "center",
                  py: 8,
                  bgcolor: "background.default",
                  borderRadius: 1,
                }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  No records found for the selected criteria.
                </Typography>
              </Paper>
            )
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Ledger;
