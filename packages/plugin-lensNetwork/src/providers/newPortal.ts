// src/providers/samarthPortal.ts
import puppeteer, { Browser, Page, PDFOptions } from "puppeteer";
import { elizaLogger, formatGoalsAsString } from "@elizaos/core";
import path from "path";
import fs from 'fs'
import { E } from "vitest/dist/chunks/reporters.6vxQttCV.js";
import crypto from 'crypto';
interface FeeInfo {
  serialNo: string;
  feeId: string;
  enrollmentNo: string;
  course: string;
  semester: string;
  session: string;
  status: string;
}
interface TableRow {
  [key: string]: string;
}
interface TableData {
  headers: string[];
  rows: TableRow[];
}

interface PaymentResult {
  screenshotPath: string;
  feeInfo?: FeeInfo;
}

export class NewPoratal {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn: boolean = false;
  private username: string = "";
  private password: string = "";

  constructor(username?: string, password?: string) {
    if (username) this.username = username;
    if (password) this.password = password;

    
  }

  async initialize(): Promise<boolean> {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
      });
      this.page = await this.browser.newPage();
      await this.page.setViewport({
        width: 1366, // Standard desktop width
        height: 768, // Standard desktop height
        deviceScaleFactor: 1,
      });
      elizaLogger.info("Browser initialized for Samarth Portal");
      return true;
    } catch (error) {
      elizaLogger.error("Failed to initialize browser", error);
      return false;
    }
  }

  async login(username?: string, password?: string): Promise<boolean> {
    if (!this.browser || !this.page) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      if (username) this.username = username;
      if (password) this.password = password;

      if (!this.username || !this.password || !this.page) {
        elizaLogger.error(
          "Username or password not provided, or page not initialized"
        );
        return false;
      }

      await this.page.goto("https://ggv.samarth.edu.in/index.php/site/login");
      await this.page.waitForSelector("#login-form");

      await this.page.type("#loginform-username", this.username);
      await this.page.type("#loginform-password", this.password);

      await this.page.click('button[name="login-button"]');
      await this.page.waitForNavigation({ waitUntil: "networkidle0" });

      const currentUrl = this.page.url();

      if (currentUrl.includes("/site/login") || currentUrl.includes("/error")) {
        return false;
      }

      this.isLoggedIn = true;
      elizaLogger.info("Successfully logged in to Samarth portal");
      return true;
    } catch (error) {
      elizaLogger.error("Error during login", error);
      return false;
    }
  }

  async fetchContent(pageURL: string): Promise<string> {
    try {
      if (!this.page) {
        throw new Error("Page not initialized");
      }
      // Navigate to the specified URL and wait until network is idle
      await this.page.goto(pageURL, { waitUntil: "networkidle2" });

      // Wait for the table to be visible on the page
      await this.page.waitForSelector("table.table", { timeout: 10000 });

      // Extract the table data using page.evaluate
      const tableData: TableData[] = await this.page.evaluate(() => {
        const tables = document.querySelectorAll("table.table");
        let extractedData: Array<{
          headers: string[];
          rows: Array<Record<string, string>>;
        }> = [];

        tables.forEach((table) => {
          // Get table headers with proper HTMLElement casting
          const headers = Array.from(table.querySelectorAll("thead tr td")).map(
            (th) => {
              return (th as HTMLTableCellElement).textContent?.trim() || "";
            }
          );

          // Get table rows with proper HTMLElement casting
          const rows = Array.from(table.querySelectorAll("tbody tr")).map(
            (row) => {
              const rowData = Array.from(row.querySelectorAll("td")).map(
                (cell) => {
                  return (
                    (cell as HTMLTableCellElement).textContent?.trim() || ""
                  );
                }
              );

              // Create an object mapping headers to cell values
              const rowObject: Record<string, string> = {};
              headers.forEach((header, index) => {
                rowObject[header] = rowData[index] || "";
              });

              return rowObject;
            }
          );

          extractedData.push({
            headers: headers,
            rows: rows,
          });
        });

        return extractedData;
      });

      elizaLogger.debug(tableData);

      // Convert the extracted data to a string
      return JSON.stringify(tableData, null, 2);
    } catch (error) {
      console.error(
        `Error fetching content from ${pageURL}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw new Error(
        `Failed to fetch content: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async fetchSpecific(pageURL: string, item?: number) {
    try {
      if (!this.page) {
        throw new Error("Page not initialized");
      }
      // Navigate to the specified URL and wait until network is idle
      await this.page.goto(pageURL, { waitUntil: "networkidle2" });
  
      // Wait for the table to be visible on the page
      await this.page.waitForSelector("table.table-bordered", { timeout: 10000 });
  
      // Extract the table data using page.evaluate
      const tableData: TableData[] = await this.page.evaluate((specificItem) => {
        const tables = document.querySelectorAll("table.table-bordered");
        let extractedData: Array<{
          headers: string[];
          rows: Array<Record<string, string>>;
        }> = [];
  
        tables.forEach((table) => {
          // Get table headers
          const headerCells = Array.from(table.querySelectorAll("thead tr td"));
          const headers = headerCells.map(
            (th) => (th as HTMLTableCellElement).textContent?.trim() || ""
          );
  
          // Get table rows
          let rows = Array.from(table.querySelectorAll("tbody tr")).map((row) => {
            const cells = Array.from(row.querySelectorAll("td"));
            const rowData: Record<string, string> = {};
            
            // Map each cell to its corresponding header
            cells.forEach((cell, index) => {
              if (index < headers.length) {
                const header = headers[index];
                const cellContent = (cell as HTMLTableCellElement).textContent?.trim() || "";
                rowData[header] = cellContent;
                
                // Also capture any action URLs from buttons/links
                if (header === "Action") {
                  const actionLink = cell.querySelector("a");
                  if (actionLink) {
                    rowData["ActionURL"] = actionLink.getAttribute("href") || "";
                  }
                }
              }
            });
            
            return rowData;
          });
  
          // If a specific item number is provided, filter to return only that row
          if (specificItem !== undefined && specificItem >= 1 && specificItem <= rows.length) {
            rows = [rows[specificItem - 1]];
          }
  
          extractedData.push({
            headers: headers,
            rows: rows,
          });
        });
  
        return extractedData;
      }, item);
  
      // Convert the extracted data to a string
      return JSON.stringify(tableData, null, 2);
    } catch (error) {
      console.error(
        `Error fetching content from ${pageURL}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw new Error(
        `Failed to fetch content: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  

  async extractHrefForItem(pageURL: string, item: number): Promise<string> {
    try {
      if (!this.page) {
        throw new Error("Page not initialized");
      }
      
      // Navigate to the specified URL and wait until network is idle
      await this.page.goto(pageURL, { waitUntil: "networkidle2" });
  
      // Wait for the table to be visible on the page
      await this.page.waitForSelector("table.table", { timeout: 10000 });
  
      // Extract the href for the specific item
      const href = await this.page.evaluate((specificItem) => {
        // Get all rows in the table body
        const rows = Array.from(document.querySelectorAll("table.table tbody tr"));
        
        // Check if the item number is valid
        if (specificItem < 1 || specificItem > rows.length) {
          throw new Error(`Item number ${specificItem} is out of range. Available items: 1-${rows.length}`);
        }
        
        // Get the specified row (subtract 1 because arrays are 0-indexed)
        const targetRow = rows[specificItem - 1];
        
        // Find the action button (the link inside the last cell)
        const actionButton = targetRow.querySelector("td:last-child a");
        
        if (!actionButton) {
          throw new Error(`No action button found for item ${specificItem}`);
        }
        
        // Return the href attribute
        return (actionButton as HTMLAnchorElement).href;
      }, 2);

      
      
  

      
      return href;
    } catch (error) {
      console.error(
        `Error extracting href for item ${item} from ${pageURL}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw new Error(
        `Failed to extract href: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }






  async courseHistory(i: number , isPDF : number ) {
    const url =
      "https://ggv.samarth.edu.in/index.php/vidhyarthi/re-registration/history";

    if(i ===  0 ){
      const courseHis = await this.fetchContent(url);
      return courseHis 
    } else {

      const courseHis = await this.fetchSpecific(url);
      if(isPDF < 1){
        // const outputPath = path.join(__dirname, 'pdfs', `docu5ment.pdf`);
        // elizaLogger.error(outputPath)
        const href = await this.extractHrefForItem(url, i);
       
        // const pdfPath = "re"
        const pdfPath = await this.pdfPrint(href);
        return { courseHis , pdfPath };
      }

    } 

    
  }

  async feeHistory(i: number , isPDF : number ) {


    const url = "https://ggv.samarth.edu.in/index.php/vidhyarthi/fee/history";

    if(i === 0 ){
      const feeHistory = await this.fetchContent(url);
      return feeHistory;
    } else {
      const feeHistory = await this.fetchSpecific(url, i);

      if(isPDF < 1){
        // const outputPath = path.join(__dirname, 'pdfs', `docu5ment.pdf`);
        // elizaLogger.error(outputPath)
        const href = await this.extractHrefForItem(url, i);
       
        // const pdfPath = "re"
        const pdfPath = await this.pdfPrint(href);
        return { feeHistory, pdfPath };
      }

      return feeHistory;
    }
  }
  async examHistory(i: number , isPDF : number) {
    try {
      const url =
        "https://ggv.samarth.edu.in/index.php/examstudent/information/index";

      if (!this.page) {
        throw new Error("Page not Initialized");
      }

      await this.page.goto(url, { waitUntil: "networkidle2" });

      await this.page.waitForSelector(".dashboard-widget", { timeout: 10000 });

      const examUrl = await this.page.evaluate(() => {
        const clickHereButton = document.querySelector(
          ".dashboard-widget .card-body .btn"
        );

        // Return the href attribute if the button exists, otherwise null
        return clickHereButton ? clickHereButton.getAttribute("href") : null;
      });

      if (typeof examUrl !== "string") {
        throw new Error("examUrl must be a string");
      }

      const upUrl = 'https://ggv.samarth.edu.in'+ examUrl;

      if(i ===  0 ){
        const examHistory = await this.fetchContent(upUrl);
        return examHistory 
      } else {
  
        const examHistory = await this.fetchSpecific(upUrl);
        if(isPDF < 1){
          // const outputPath = path.join(__dirname, 'pdfs', `docu5ment.pdf`);
          // elizaLogger.error(outputPath)
          const href = await this.extractHrefForItem(upUrl, i);
         
          // const pdfPath = "re"
          const pdfPath = await this.pdfPrintUpdated(href);
          return { examHistory , pdfPath };
        }
  
      } 
    } catch (error) {
      elizaLogger.error("Error on Extracting the URL");
    }
  }
  async admidCard(i: number , isPDF : number) {
    try {
      const url =
        "https://ggv.samarth.edu.in/index.php/examstudent/information/index";

      if (!this.page) {
        throw new Error("Page not Initialized");
      }

      await this.page.goto(url, { waitUntil: "networkidle2" });

      await this.page.waitForSelector(".dashboard-widget", { timeout: 10000 });

      const examUrl = await await this.page.evaluate(() => {
        // Target the link containing "Hall Admit Card" text
        const hallAdmitCardLink = Array.from(document.querySelectorAll('li a'))
          .find(element => element.textContent?.includes('Hall Admit Card'));
        
        // Return the href attribute if the link exists, otherwise null
        return hallAdmitCardLink ? hallAdmitCardLink.getAttribute('href') : null;
      });

      if (typeof examUrl !== "string") {
        throw new Error("examUrl must be a string");
      }

      const upUrl = 'https://ggv.samarth.edu.in'+ examUrl;

      if(i ===  0 ){
        const admitCard = await this.fetchContent(upUrl);
        return admitCard 
      } else {
  
        const admitCard = await this.fetchSpecific(upUrl);
        if(isPDF < 1){
          // const outputPath = path.join(__dirname, 'pdfs', `docu5ment.pdf`);
          // elizaLogger.error(outputPath)
          const href = await this.extractHrefForItem(upUrl, i);
         
          // const pdfPath = "re"
          const pdfPath = await this.admitPrint(href);
          return { admitCard , pdfPath };
        }
  
      } 
    } catch (error) {
      elizaLogger.error("Error on Extracting the URL");
    }
  }



  async pdfPrint(url: string): Promise<string | undefined> {
  try {
    if (!this.page) {
      throw new Error('Page Not initialized at the Initiation');
    }

    // Set a longer navigation timeout (30 seconds)
    await this.page.setDefaultNavigationTimeout(30000);
    
    // Add longer timeout for page goto
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 // 60 seconds timeout
    });
    
    // Add timeout to selector wait
    await this.page.waitForSelector('button.btn.btn-space.btn-success', { 
      timeout: 30000 
    });

    // Hide no-print elements
    await this.page.addStyleTag({
      content: '.no-print { display: none !important; }'
    });

    // Wait a bit for any JavaScript to finish rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      timeout: 60000, // 60 seconds timeout for PDF generation
    };

    elizaLogger.info('Starting PDF generation');
    
    // Generate PDF as buffer instead of saving to file
    const pdfBuffer = await this.page.pdf(pdfOptions);
    
    elizaLogger.info(`PDF buffer generated, size: ${pdfBuffer.length} bytes`);
    
    // Convert buffer to base64 string - use a try/catch specifically for this operation
    // which might fail for very large buffers
    
      const base64Pdf = pdfBuffer.toString('base64');
      
      // Create data URL
      const dataUrl = `data:application/pdf;base64,${base64Pdf}`;
      
      elizaLogger.info('PDF generated as data URL successfully');
      
      return dataUrl;
    

  } catch (error) {
    elizaLogger.error('Error on generating the PDF:', error);
    throw error;
  }
}

async admitPrint(url: string): Promise<string | undefined> {
  try {
    if (!this.page) {
      throw new Error('Page Not initialized at the Initiation');
    }

    // Set a longer navigation timeout (30 seconds)
    await this.page.setDefaultNavigationTimeout(30000);
    
    // Add longer timeout for page goto
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 // 60 seconds timeout
    });
    
    // Add timeout to selector wait
    await this.page.waitForSelector('button.btn.btn-secondary.noprint', { 
      timeout: 30000 
    });

    // Hide no-print elements
    await this.page.addStyleTag({
      content: '.no-print { display: none !important; }'
    });

    // Wait a bit for any JavaScript to finish rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      timeout: 60000, // 60 seconds timeout for PDF generation
    };

    elizaLogger.info('Starting PDF generation');
    
    // Generate PDF as buffer instead of saving to file
    const pdfBuffer = await this.page.pdf(pdfOptions);
    
    elizaLogger.info(`PDF buffer generated, size: ${pdfBuffer.length} bytes`);
    
    // Convert buffer to base64 string - use a try/catch specifically for this operation
    // which might fail for very large buffers
    
      const base64Pdf = pdfBuffer.toString('base64');
      
      // Create data URL
      const dataUrl = `data:application/pdf;base64,${base64Pdf}`;
      
      elizaLogger.info('PDF generated as data URL successfully');
      
      return dataUrl;
    

  } catch (error) {
    elizaLogger.error('Error on generating the PDF:', error);
    throw error;
  }
}

async pdfPrintUpdated(url: string): Promise<string | undefined> {
  try {
    if (!this.page) {
      throw new Error('Page Not initialized at the Initiation');
    }

    // Set a longer navigation timeout (30 seconds)
    await this.page.setDefaultNavigationTimeout(30000);
    
    // Add longer timeout for page goto
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 // 60 seconds timeout
    });
    
    // Add timeout to selector wait
    await this.page.waitForSelector('button.btn.btn-sm.btn-success.mb-3', { 
      timeout: 30000 
    });

    // Hide no-print elements
    await this.page.addStyleTag({
      content: '.no-print { display: none !important; }'
    });

    // Wait a bit for any JavaScript to finish rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      timeout: 60000, // 60 seconds timeout for PDF generation
    };

    elizaLogger.info('Starting PDF generation');
    
    // Generate PDF as buffer instead of saving to file
    const pdfBuffer = await this.page.pdf(pdfOptions);
    
    elizaLogger.info(`PDF buffer generated, size: ${pdfBuffer.length} bytes`);
    
    // Convert buffer to base64 string - use a try/catch specifically for this operation
    // which might fail for very large buffers
    
      const base64Pdf = pdfBuffer.toString('base64');
      
      // Create data URL
      const dataUrl = `data:application/pdf;base64,${base64Pdf}`;
      
      elizaLogger.info('PDF generated as data URL successfully');
      
      return dataUrl;
    

  } catch (error) {
    elizaLogger.error('Error on generating the PDF:', error);
    throw error;
  }
}
   async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
      elizaLogger.info("Browser closed");
    }
  }
}
export const initializeSamarthPortal = (
  username?: string,
  password?: string
): NewPoratal | null => {
  try {
    const samarthService = new NewPoratal(username, password);
    return samarthService;
  } catch (error) {
    elizaLogger.error("Failed to initialize Samarth Portal service", error);
    return null;
  }
};
