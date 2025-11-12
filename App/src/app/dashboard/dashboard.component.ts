import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent { 
  constructor(private router: Router) {}

  logout() {
    this.router.navigate(['/login']);
  }

}