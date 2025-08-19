import React, { useState, useEffect, useCallback } from "react";
import { useApiOperation } from "../../hooks/useApiOperation";
import { Card, Button } from "../../components/common";
import { toast } from "react-hot-toast";
import { authService } from "../../services/authService";
import styles from "./UserManagementPage.module.css";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    role: "",
    search: "",
  });

  const { execute: fetchUsers } = useApiOperation("fetch users");
  const { execute: updateUserStatus } = useApiOperation("update user status");
  const { execute: deleteUser } = useApiOperation("delete user");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log("[USER-MANAGEMENT] Starting to load users");
      const response = await fetchUsers(() => authService.getUsers());
      console.log("[USER-MANAGEMENT] Response received:", response);
      console.log("[USER-MANAGEMENT] Response structure:", {
        success: response?.success,
        dataType: typeof response?.data,
        dataLength: Array.isArray(response?.data)
          ? response?.data.length
          : "not array",
        dataKeys:
          response?.data && !Array.isArray(response?.data)
            ? Object.keys(response?.data)
            : [],
      });

      // The authService.getUsers() returns a response object, we need to access response.data
      // The useApiOperation hook returns the raw result from the API call
      let userData = null;
      let isSuccess = false;

      // Check if response is the actual data (already processed by useApiOperation)
      if (response?.success && Array.isArray(response?.data)) {
        userData = response.data;
        isSuccess = true;
        console.log("[USER-MANAGEMENT] Using direct response structure");
      } else if (
        response?.data?.success &&
        Array.isArray(response?.data?.data)
      ) {
        // Nested response structure
        userData = response.data.data;
        isSuccess = response.data.success;
        console.log("[USER-MANAGEMENT] Using nested response structure");
      } else if (Array.isArray(response)) {
        // Array response structure
        userData = response;
        isSuccess = true;
        console.log("[USER-MANAGEMENT] Using array response structure");
      } else {
        // Try to extract from response.data if it's an object
        console.log("[USER-MANAGEMENT] Trying to extract from response.data");
        console.log(
          "[USER-MANAGEMENT] Response.data type:",
          typeof response?.data
        );
        console.log(
          "[USER-MANAGEMENT] Response.data keys:",
          Object.keys(response?.data || {})
        );

        if (response?.data?.success && Array.isArray(response?.data?.data)) {
          userData = response.data.data;
          isSuccess = response.data.success;
          console.log("[USER-MANAGEMENT] Found data in response.data.data");
        }
      }

      console.log("[USER-MANAGEMENT] Final user data:", userData);
      console.log("[USER-MANAGEMENT] Is success:", isSuccess);

      if (isSuccess && userData && Array.isArray(userData)) {
        console.log("[USER-MANAGEMENT] Setting users:", userData);
        setUsers(userData);
      } else {
        console.log(
          "[USER-MANAGEMENT] Response not successful or invalid data:",
          response
        );
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("[USER-MANAGEMENT] Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      console.log(
        "[USER-MANAGEMENT] Starting status update for user:",
        userId,
        "to status:",
        newStatus
      );
      const response = await updateUserStatus(() =>
        authService.updateUserStatus(userId, newStatus)
      );
      console.log(
        "[USER-MANAGEMENT] Status update response received:",
        response
      );
      console.log("[USER-MANAGEMENT] Status update response structure:", {
        success: response?.success,
        message: response?.message,
        dataType: typeof response?.data,
        dataKeys: response?.data ? Object.keys(response?.data) : [],
      });

      // Check multiple possible response structures
      let isSuccess = false;
      let message = "";

      if (response?.success) {
        // Direct success
        isSuccess = true;
        message = response.message || "User status updated successfully";
        console.log("[USER-MANAGEMENT] Using direct success structure");
      } else if (response?.data?.success) {
        // Nested success
        isSuccess = true;
        message = response.data.message || "User status updated successfully";
        console.log("[USER-MANAGEMENT] Using nested success structure");
      } else if (response?.message && response?.success === true) {
        // Alternative structure
        isSuccess = true;
        message = response.message;
        console.log("[USER-MANAGEMENT] Using alternative success structure");
      }

      console.log("[USER-MANAGEMENT] Final status update result:", {
        isSuccess,
        message,
      });

      if (isSuccess) {
        toast.success(message);
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, status: newStatus } : user
          )
        );
        setShowStatusModal(false);
        setSelectedUser(null);
        console.log("[USER-MANAGEMENT] Status update completed successfully");
      } else {
        console.log("[USER-MANAGEMENT] Status update failed:", response);
        toast.error("Failed to update user status");
      }
    } catch (error) {
      console.error("[USER-MANAGEMENT] Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      console.log("[USER-MANAGEMENT] Starting delete for user:", userId);
      const response = await deleteUser(() => authService.deleteUser(userId));
      console.log("[USER-MANAGEMENT] Delete response received:", response);
      console.log("[USER-MANAGEMENT] Delete response structure:", {
        success: response?.success,
        message: response?.message,
        dataType: typeof response?.data,
        dataKeys: response?.data ? Object.keys(response?.data) : [],
      });

      // Check multiple possible response structures
      let isSuccess = false;
      let message = "";

      if (response?.success) {
        // Direct success
        isSuccess = true;
        message = response.message || "User deleted successfully";
        console.log(
          "[USER-MANAGEMENT] Using direct success structure for delete"
        );
      } else if (response?.data?.success) {
        // Nested success
        isSuccess = true;
        message = response.data.message || "User deleted successfully";
        console.log(
          "[USER-MANAGEMENT] Using nested success structure for delete"
        );
      } else if (response?.message && response?.success === true) {
        // Alternative structure
        isSuccess = true;
        message = response.message;
        console.log(
          "[USER-MANAGEMENT] Using alternative success structure for delete"
        );
      }

      console.log("[USER-MANAGEMENT] Final delete result:", {
        isSuccess,
        message,
      });

      if (isSuccess) {
        toast.success(message);
        setUsers(users.filter((user) => user.id !== userId));
        setShowDeleteModal(false);
        setSelectedUser(null);
        console.log("[USER-MANAGEMENT] Delete completed successfully");
      } else {
        console.log("[USER-MANAGEMENT] Delete failed:", response);
        toast.error("Failed to delete user");
      }
    } catch (error) {
      console.error("[USER-MANAGEMENT] Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "suspended":
        return "danger";
      case "closed":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesStatus = !filters.status || user.status === filters.status;
    const matchesRole = !filters.role || user.role === filters.role;
    const matchesSearch =
      !filters.search ||
      user.firstName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email?.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStatus && matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading users...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>User Management</h1>
        <p>Manage user accounts and permissions</p>
      </div>

      {/* Filters */}
      <Card className={styles.filters}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Role:</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card className={styles.usersSection}>
        <div className={styles.sectionHeader}>
          <h2>Users ({filteredUsers.length})</h2>
          <Button onClick={loadUsers} variant="outline">
            Refresh
          </Button>
        </div>

        {filteredUsers.length > 0 ? (
          <div className={styles.usersGrid}>
            {filteredUsers.map((user) => (
              <div key={user.id} className={styles.userCard}>
                <div className={styles.userHeader}>
                  <div className={styles.userInfo}>
                    <h3>
                      {user.firstName} {user.lastName}
                    </h3>
                    <p>{user.email}</p>
                    <div className={styles.userMeta}>
                      <span
                        className={`${styles.status} ${styles[getStatusColor(user.status)]}`}
                      >
                        {user.status}
                      </span>
                      <span className={styles.role}>{user.role}</span>
                    </div>
                  </div>
                  <div className={styles.userActions}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowStatusModal(true);
                      }}
                    >
                      Change Status
                    </Button>
                    {user.role !== "admin" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                <div className={styles.userDetails}>
                  <div className={styles.detailItem}>
                    <span>ID:</span>
                    <span>{user.id}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Created:</span>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  {user.lastLoginAt && (
                    <div className={styles.detailItem}>
                      <span>Last Login:</span>
                      <span>{formatDate(user.lastLoginAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No users found matching your criteria.</p>
            <Button
              onClick={() => setFilters({ status: "", role: "", search: "" })}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Status Update Modal */}
      {showStatusModal && selectedUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Update User Status</h3>
            <p>
              Update status for {selectedUser.firstName} {selectedUser.lastName}
            </p>
            <div className={styles.statusOptions}>
              {["active", "pending", "suspended", "closed"].map((status) => (
                <Button
                  key={status}
                  variant={
                    selectedUser.status === status ? "primary" : "outline"
                  }
                  onClick={() => handleStatusUpdate(selectedUser.id, status)}
                  disabled={selectedUser.status === status}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Delete User</h3>
            <p>
              Are you sure you want to delete {selectedUser.firstName}{" "}
              {selectedUser.lastName}? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <Button
                variant="danger"
                onClick={() => handleDeleteUser(selectedUser.id)}
              >
                Delete User
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
