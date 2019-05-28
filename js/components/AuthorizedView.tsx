import * as React from "react";

interface AuthorizedViewProps {
    accountType: string
    authorizationCode: string
};

export default class AuthorizedView extends React.Component<AuthorizedViewProps, {}> {
    render() {
        return <div>
            <div>Account type: {this.props.accountType}</div>
            <div>Token: {this.props.authorizationCode}</div>
        </div>
    }
};